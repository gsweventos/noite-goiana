import { v4 as uuidv4 } from 'uuid';
import { db, admin } from './firebaseAdmin';
import { mpPayment } from './mercadopago';
import { signTicketPayload } from './qr';
import { buildTicketPdf } from './pdf';
import { sendTicketEmail } from './email';

type NovoStatus = 'aprovado' | 'rejeitado' | 'em_analise';

/**
 * Fora de qualquer transação: gera o(s) PDF(s) dos ingressos de um pagamento
 * aprovado e envia por e-mail (não bloqueia a confirmação em si). Marca
 * `emailEnviado` pra nunca mandar duas vezes, mesmo se o status for
 * reconsultado várias vezes depois.
 */
async function enviarEmailDosIngressos(paymentRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const paySnap = await paymentRef.get();
  const payment = paySnap.data();
  if (!(payment?.status === 'aprovado' && payment.ticketIds?.length && !payment.emailEnviado)) return;

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
  await paymentRef.update({ emailEnviado: true });
}

/**
 * Núcleo da confirmação de PAGAMENTOS DE VERDADE (Pix/cartão via Mercado
 * Pago): dado um pagamento e o status que deve assumir, atualiza o registro
 * e — se for "aprovado" — debita o LOTE de venda e gera os ingressos dentro
 * de uma transação (evitando overselling), depois envia o(s) e-mail(s).
 *
 * É idempotente: chamar de novo para um pagamento já aprovado não repete
 * nada. Cortesias NÃO passam por aqui — ver liberarCortesia mais abaixo,
 * que usa uma reserva própria, separada dos lotes de venda.
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

    const cupomRef = novoStatus === 'aprovado' && payment.cupomCodigo ? db.collection('coupons').doc(payment.cupomCodigo) : null;
    const cupomSnap = cupomRef ? await tx.get(cupomRef) : null;

    // --- Fase 2: agora sim, as escritas ---
    tx.update(paymentRef, {
      status: novoStatus,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      ...extraFields,
    });

    if (novoStatus !== 'aprovado') return;

    // Soma 1 no contador de usos do cupom (só quando o pagamento é aprovado
    // de verdade — nunca em pagamentos pendentes/rejeitados).
    if (cupomRef && cupomSnap?.exists) {
      tx.update(cupomRef, { usosAtuais: (cupomSnap.data()!.usosAtuais ?? 0) + 1 });
    }

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
        origem: 'checkout',
      });
      ticketIds.push(ticketId);
    }

    tx.update(paymentRef, { ticketIds });
  });

  await enviarEmailDosIngressos(paymentRef);
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
 * Libera ingresso(s) de CORTESIA — sem pagamento e sem descontar de nenhum
 * lote de venda. Usa uma reserva própria (`event.cortesias`), separada dos
 * lotes públicos: não afasta vaga de quem está comprando, e não aparece
 * pro público em nenhum momento (não faz parte de `event.lotes`, que é o
 * único array que o site público lê).
 *
 * O ingresso gerado é idêntico a um pago: tem QR Code, aparece no painel do
 * destinatário, passa no check-in — só o `origem: 'manual'` no banco marca
 * que essa não foi uma venda de verdade (usado pra excluir da receita).
 */
export async function liberarCortesia(params: LiberarCortesiaParams): Promise<string> {
  const paymentRef = db.collection('payments').doc();
  const eventRef = db.collection('events').doc(params.eventoId);

  await db.runTransaction(async (tx) => {
    // --- Fase 1: leitura ---
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw new Error('Evento não encontrado.');
    const evento = eventSnap.data()!;
    const cortesias = evento.cortesias ?? { quantidadeTotal: 0, quantidadeUsada: 0 };
    const disponiveis = cortesias.quantidadeTotal - cortesias.quantidadeUsada;
    if (disponiveis < params.quantidade) {
      throw new Error(
        disponiveis <= 0
          ? 'Não há cortesias disponíveis. Aumente o total em "Editar festa" → Cortesias.'
          : `Só restam ${disponiveis} cortesia(s) disponível(is) na reserva.`
      );
    }

    // --- Fase 2: escritas ---
    tx.set(paymentRef, {
      eventoId: params.eventoId,
      lotId: 'cortesia',
      quantidade: params.quantidade,
      compradorNome: params.comprador.nome,
      compradorCpf: params.comprador.cpf,
      compradorEmail: params.comprador.email,
      compradorTelefone: params.comprador.telefone,
      compradorDataNascimento: params.comprador.dataNascimento ?? null,
      valorTotal: 0,
      status: 'aprovado',
      origem: 'manual',
      motivo: params.motivo ?? null,
      liberadoPor: params.liberadoPor,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(eventRef, {
      cortesias: { quantidadeTotal: cortesias.quantidadeTotal, quantidadeUsada: cortesias.quantidadeUsada + params.quantidade },
    });

    const ticketIds: string[] = [];
    for (let i = 0; i < params.quantidade; i++) {
      const ticketId = uuidv4();
      const qrPayload = signTicketPayload(ticketId, params.eventoId);
      tx.set(db.collection('tickets').doc(ticketId), {
        codigo: `NG-${ticketId.slice(0, 6).toUpperCase()}`,
        qrPayload,
        eventoId: params.eventoId,
        eventoNome: evento.nome,
        lotId: 'cortesia',
        lotNome: 'Cortesia',
        compradorNome: params.comprador.nome,
        compradorCpf: params.comprador.cpf,
        compradorEmail: params.comprador.email,
        compradorTelefone: params.comprador.telefone,
        compradorDataNascimento: params.comprador.dataNascimento ?? null,
        numero: i + 1,
        status: 'valido',
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: paymentRef.id,
        origem: 'manual',
      });
      ticketIds.push(ticketId);
    }

    tx.update(paymentRef, { ticketIds });
  });

  await enviarEmailDosIngressos(paymentRef);
  return paymentRef.id;
}
