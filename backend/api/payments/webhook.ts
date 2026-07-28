import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { asaasRequest } from '../_lib/asaas';
import { signTicketPayload } from '../_lib/qr';
import { buildTicketPdf } from '../_lib/pdf';
import { sendTicketEmail } from '../_lib/email';

const EVENTOS_APROVADOS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const EVENTOS_REJEITADOS = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'];

/**
 * POST /api/payments/webhook
 *
 * Recebido do Asaas. Regra de ouro: NUNCA confiar no corpo do webhook
 * isoladamente — validamos o token secreto E reconsultamos a API do Asaas
 * pelo id do pagamento antes de gerar qualquer ingresso.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(200).end(); // o Asaas não gosta de erro aqui

  try {
    // 0. Confirma que a notificação realmente veio do Asaas, comparando o
    // token secreto configurado na criação do webhook (nunca a API Key).
    const receivedToken = req.headers['asaas-access-token'];
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN ?? '';
    if (!expectedToken || receivedToken !== expectedToken) {
      console.warn('[webhook] token inválido — notificação ignorada');
      return res.status(200).end();
    }

    const body = req.body ?? {};
    const event: string | undefined = body.event;
    const paymentId: string | undefined = body.payment?.id;

    if (!event || !paymentId) return res.status(200).end();

    // 1. Reconsulta o pagamento diretamente na API do Asaas (nunca confia só no corpo recebido).
    const payment = await asaasRequest<{ status: string; externalReference?: string }>(`/payments/${paymentId}`);
    const externalReference = payment.externalReference;
    if (!externalReference) return res.status(200).end();

    const paymentRef = db.collection('payments').doc(externalReference);

    await db.runTransaction(async (tx) => {
      const paySnap = await tx.get(paymentRef);
      if (!paySnap.exists) return;
      const paymentDoc = paySnap.data()!;

      // Idempotência: se já processamos esse pagamento como aprovado, não repete.
      if (paymentDoc.status === 'aprovado') return;

      const novoStatus =
        EVENTOS_APROVADOS.includes(event) || payment.status === 'RECEIVED' || payment.status === 'CONFIRMED'
          ? 'aprovado'
          : EVENTOS_REJEITADOS.includes(event)
          ? 'rejeitado'
          : 'em_analise';

      tx.update(paymentRef, {
        status: novoStatus,
        asaasPaymentId: paymentId,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (novoStatus !== 'aprovado') return;

      // 2. Pagamento aprovado: debita o lote e gera os ingressos DENTRO da transação,
      //    para nunca vender além da quantidade disponível mesmo sob concorrência.
      const eventRef = db.collection('events').doc(paymentDoc.eventoId);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) return;
      const evento = eventSnap.data()!;
      const lotes = evento.lotes as any[];
      const loteIndex = lotes.findIndex((l) => l.id === paymentDoc.lotId);
      if (loteIndex === -1) return;

      lotes[loteIndex] = {
        ...lotes[loteIndex],
        quantidadeVendida: lotes[loteIndex].quantidadeVendida + paymentDoc.quantidade,
      };
      tx.update(eventRef, { lotes });

      const ticketIds: string[] = [];
      for (let i = 0; i < paymentDoc.quantidade; i++) {
        const ticketId = uuidv4();
        const qrPayload = signTicketPayload(ticketId, paymentDoc.eventoId);
        const ticketRef = db.collection('tickets').doc(ticketId);
        tx.set(ticketRef, {
          codigo: `NG-${ticketId.slice(0, 6).toUpperCase()}`,
          qrPayload,
          eventoId: paymentDoc.eventoId,
          eventoNome: evento.nome,
          lotId: paymentDoc.lotId,
          lotNome: lotes[loteIndex].nome,
          compradorNome: paymentDoc.compradorNome,
          compradorCpf: paymentDoc.compradorCpf,
          compradorEmail: paymentDoc.compradorEmail,
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
    const paymentDoc = finalPaySnap.data();
    if (paymentDoc?.status === 'aprovado' && paymentDoc.ticketIds?.length) {
      const eventSnap = await db.collection('events').doc(paymentDoc.eventoId).get();
      const evento = eventSnap.data()!;
      for (const ticketId of paymentDoc.ticketIds as string[]) {
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
    console.error('[webhook] erro ao processar notificação do Asaas:', err);
    // Retorna 200 mesmo em erro interno para evitar reenvios agressivos
    // enquanto o erro é investigado via logs — ajuste conforme sua política.
    return res.status(200).end();
  }
}
