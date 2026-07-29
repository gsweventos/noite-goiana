import { v4 as uuidv4 } from 'uuid';
import { db, admin } from './firebaseAdmin';
import { mpPayment } from './mercadopago';
import { signTicketPayload } from './qr';
import { buildTicketPdf } from './pdf';
import { sendTicketEmail } from './email';

/**
 * Reconsulta um pagamento na API do Mercado Pago pelo mpPaymentId e, se
 * estiver aprovado, gera os ingressos (dentro de uma transação, evitando
 * overselling) e dispara o e-mail com o PDF.
 *
 * É idempotente: chamar de novo para um pagamento já processado não duplica
 * nada. Usado tanto pelo webhook (payments/webhook.ts) quanto pela checagem
 * de status feita pelo próprio site enquanto o comprador espera na tela
 * (payments/[id]/status.ts) — assim, mesmo que o webhook do Mercado Pago
 * atrase ou não chegue, a confirmação acontece de qualquer forma assim que
 * o comprador (ou o site, via polling) verificar o status.
 */
export async function confirmarPagamentoPorMpId(mpPaymentId: string | number): Promise<void> {
  const mpData = await mpPayment.get({ id: mpPaymentId });
  const externalReference = mpData.external_reference;
  const status = mpData.status; // approved | pending | rejected | ...

  if (!externalReference) return;

  const paymentRef = db.collection('payments').doc(externalReference);

  await db.runTransaction(async (tx) => {
    // --- Fase 1: TODAS as leituras primeiro (exigência do Firestore) ---
    const paySnap = await tx.get(paymentRef);
    if (!paySnap.exists) return;
    const payment = paySnap.data()!;

    // Idempotência: se já processamos esse pagamento como aprovado, não repete.
    if (payment.status === 'aprovado') return;

    const novoStatus =
      status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'em_analise';

    const eventRef = db.collection('events').doc(payment.eventoId);
    const eventSnap = novoStatus === 'aprovado' ? await tx.get(eventRef) : null;

    // --- Fase 2: agora sim, as escritas ---
    tx.update(paymentRef, {
      status: novoStatus,
      mpPaymentId: String(mpPaymentId),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
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
        numero: i + 1,
        status: 'valido',
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: externalReference,
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
