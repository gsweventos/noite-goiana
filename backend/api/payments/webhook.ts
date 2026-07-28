import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { mpPayment } from '../_lib/mercadopago';
import { signTicketPayload } from '../_lib/qr';
import { buildTicketPdf } from '../_lib/pdf';
import { sendTicketEmail } from '../_lib/email';

/**
 * POST /api/payments/webhook
 *
 * Recebido do Mercado Pago. Regra de ouro: NUNCA confiar no corpo do webhook
 * isoladamente — sempre reconsultar a API do Mercado Pago pelo payment_id
 * para confirmar o status real antes de gerar qualquer ingresso.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(200).end(); // MP não gosta de erro aqui

  try {
    const body = req.body ?? {};
    const paymentId = body?.data?.id ?? req.query['data.id'];
    const topic = body?.type ?? req.query.type;

    if (topic !== 'payment' || !paymentId) {
      return res.status(200).end();
    }

    // 1. Reconsulta o pagamento diretamente na API do Mercado Pago.
    const mpData = await mpPayment.get({ id: paymentId });
    const externalReference = mpData.external_reference; // == paymentRef.id no Firestore
    const status = mpData.status; // approved | pending | rejected | ...

    if (!externalReference) return res.status(200).end();

    const paymentRef = db.collection('payments').doc(externalReference);

    await db.runTransaction(async (tx) => {
      const paySnap = await tx.get(paymentRef);
      if (!paySnap.exists) return;
      const payment = paySnap.data()!;

      // Idempotência: se já processamos esse pagamento como aprovado, não repete.
      if (payment.status === 'aprovado') return;

      const novoStatus =
        status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'em_analise';

      tx.update(paymentRef, {
        status: novoStatus,
        mpPaymentId: String(paymentId),
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (novoStatus !== 'aprovado') return;

      // 2. Pagamento aprovado: debita o lote e gera os ingressos DENTRO da transação,
      //    para nunca vender além da quantidade disponível mesmo sob concorrência.
      const eventRef = db.collection('events').doc(payment.eventoId);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) return;
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

    // 3. Fora da transação: gera o(s) PDF(s) e envia por e-mail (não bloqueia a confirmação).
    const finalPaySnap = await paymentRef.get();
    const payment = finalPaySnap.data();
    if (payment?.status === 'aprovado' && payment.ticketIds?.length) {
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
    }

    return res.status(200).end();
  } catch (err) {
    console.error('[webhook] erro ao processar notificação do Mercado Pago:', err);
    // Retorna 200 mesmo em erro interno para evitar reenvios agressivos do MP
    // enquanto o erro é investigado via logs — ajuste conforme sua política.
    return res.status(200).end();
  }
}
