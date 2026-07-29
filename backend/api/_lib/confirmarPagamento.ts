import { v4 as uuidv4 } from 'uuid';
import { db, admin } from './firebaseAdmin';
import { mpPayment } from './mercadopago';
import { signTicketPayload } from './qr';
import { buildTicketPdf } from './pdf';
import { sendTicketEmail } from './email';

type NovoStatus = 'aprovado' | 'rejeitado' | 'em_analise';

/**
 * Núcleo da confirmação: dado um pagamento (por referência do Firestore) e o
 * status que deve assumir, atualiza o registro e — se for "aprovado" — gera
 * os ingressos dentro de uma transação (evitando overselling), envia o(s)
 * e-mail(s) e retorna.
 *
 * É idempotente: chamar de novo para um pagamento já aprovado não duplica
 * nada. Usado por três entradas diferentes:
 *   1. confirmarPagamentoPorMpId — webhook/polling de pagamentos reais
 *   2. liberarCortesia — ingressos liberados manualmente pelo admin, sem pagamento
 */
async function processarStatusDoPagamento(
  paymentRef: FirebaseFirestore.DocumentReference,
  novoStatus: NovoStatus,
  extraFields: Record<string, unknown> = {}
): Promise<void> {
  await db.runTransaction(async (tx) => {
    // --- Fase 1: TODAS as leituras primeiro (exigência do Firestore) ---
    const paySnap = await tx.get(paymentRef);
    if (!paySnap.exists) return;
    const payment = paySnap.data()!;

    // Idempotência: se já processamos esse pagamento como aprovado, não repete.
    if (payment.status === 'aprovado') return;

    const eventRef = db.collection('events').doc(payment.eventoId);
    const eventSnap = novoStatus === 'aprovado' ? await tx.get(eventRef) : null;

    // --- Fase 2: agora sim, as escritas ---
    tx.update(paymentRef, {
      status: novoStatus,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      ...extraFields,
    });

    if (novoStatus !== 'aprovado') return;
    if (!eventSnap || !eventSnap.exists) return;

    // Pagamento aprovado: debita o lote e gera os ingressos DENTRO da
    // transação, para nunca vender além da quantidade disponível mesmo sob
    // concorrência (ex.: webhook e polling chegando quase ao mesmo tempo).
    const evento = eventSnap.data()!;
    const lotes = evento.lotes as any[];
    const loteIndex = lotes.findIndex((l) => l.id === payment.lotId);
    if (loteIndex === -1) return;

    lotes[loteIndex] = {
      ...lotes[loteIndex],
      quantidadeVendida: lotes[loteIndex].quantidadeVendida + payment.quantidade,
    };
    tx.update(eventRef, { lotes });

    const ticketIds: string[] = [];
    for (let i = 0; i < payment.quantidade; i++) {
      const ticketId = uuidv4();
      const qrPayload = signTicketPayload(ticketId, payment.eventoId);
      const ticketRef = db.collection('tickets').doc(ticketId);
      tx.set(ticketRef, {
        codigo: `NG-${ticketId.slice(0, 6).toUpperCase()}`,
        qrPayload,
        eventoId: payment.eventoId,
        eventoNome: evento.nome,
        lotId: payment.lotId,
        lotNome: lotes[loteIndex].nome,
        compradorNome: payment.compradorNome,
        compradorCpf: payment.compradorCpf,
        compradorEmail: payment.compradorEmail,
        compradorTelefone: payment.compradorTelefone ?? null,
        compradorDataNascimento: payment.compradorDataNascimento ?? null,
        numero: i + 1,
        status: 'valido',
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: paymentRef.id,
        origem: payment.origem ?? 'checkout',
      });
      ticketIds.push(ticketId);
    }

    tx.update(paymentRef, { ticketIds });
  });

  // Fora da transação: gera o(s) PDF(s) e envia por e-mail (não bloqueia a confirmação).
  const finalPaySnap = await paymentRef.get();
  const payment = finalPaySnap.data();
  if (payment?.status === 'aprovado' && payment.ticketIds?.length && !payment.emailEnviado) {
    const eventSnap = await db.collection('events').doc(payment.eventoId).get();
    const evento = eventSnap.data()!;
    for (const ticketId of payment.ticketIds as string[]) {
      const ticketSnap = await db.collection('tickets').doc(ticketId).get();
      const ticket = ticketSnap.data()!;
      const pdf = await buildTicketPdf({
        eventoNome: evento.nome,
        local: `${evento.local.local}, ${evento.local.cidade} - ${evento.local.estado}`,
        dataFormatada: new Date(evento.dataInicio).toLocaleString('pt-BR'),
        compradorNome: ticket.compradorNome,
        codigo: ticket.codigo,
        qrPayload: ticket.qrPayload,
      });
      await sendTicketEmail({
        to: ticket.compradorEmail,
        nomeComprador: ticket.compradorNome,
        eventoNome: evento.nome,
        pdfBuffer: pdf,
      });
    }
    // Evita reenviar o e-mail se o status for reconsultado de novo depois.
    await paymentRef.update({ emailEnviado: true });
  }
}

/**
 * Reconsulta um pagamento na API do Mercado Pago pelo mpPaymentId e processa
 * o resultado (ver processarStatusDoPagamento). Regra de ouro: NUNCA confiar
 * no corpo do webhook isoladamente — sempre reconsultar a API pra confirmar
 * o status real antes de gerar qualquer ingresso.
 *
 * Usado tanto pelo webhook (payments/webhook.ts) quanto pela checagem de
 * status feita pelo próprio site enquanto o comprador espera na tela
 * (payments/[id]/status.ts) — assim, mesmo que o webhook do Mercado Pago
 * atrase ou não chegue, a confirmação acontece de qualquer forma assim que
 * o comprador (ou o site, via polling) verificar o status.
 */
export async function confirmarPagamentoPorMpId(mpPaymentId: string | number): Promise<void> {
  const mpData = await mpPayment.get({ id: mpPaymentId });
  const externalReference = mpData.external_reference;
  const status = mpData.status; // approved | pending | rejected | ...

  if (!externalReference) return;

  const novoStatus: NovoStatus =
    status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'em_analise';

  const paymentRef = db.collection('payments').doc(externalReference);
  await processarStatusDoPagamento(paymentRef, novoStatus, { mpPaymentId: String(mpPaymentId) });
}

interface LiberarCortesiaParams {
  eventoId: string;
  lotId: string;
  quantidade: number;
  comprador: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    dataNascimento?: string;
  };
  motivo?: string;
  liberadoPor: string; // uid do admin que liberou
}

/**
 * Libera ingresso(s) SEM pagamento — usado pelo admin para dar cortesias.
 * Cria um registro de pagamento já como "aprovado", com origem "manual", e
 * reaproveita a mesma lógica de geração de ingresso (QR Code, débito do
 * lote, envio de e-mail) usada nas compras normais — na prática, o ingresso
 * liberado assim é idêntico a um pago, tanto pro comprador (aparece no
 * painel dele normalmente) quanto pro check-in.
 */
export async function liberarCortesia(params: LiberarCortesiaParams): Promise<string> {
  const paymentRef = db.collection('payments').doc();
  await paymentRef.set({
    eventoId: params.eventoId,
    lotId: params.lotId,
    quantidade: params.quantidade,
    compradorNome: params.comprador.nome,
    compradorCpf: params.comprador.cpf,
    compradorEmail: params.comprador.email,
    compradorTelefone: params.comprador.telefone,
    compradorDataNascimento: params.comprador.dataNascimento ?? null,
    valorTotal: 0,
    status: 'pendente',
    origem: 'manual',
    motivo: params.motivo ?? null,
    liberadoPor: params.liberadoPor,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });

  await processarStatusDoPagamento(paymentRef, 'aprovado');
  return paymentRef.id;
}
