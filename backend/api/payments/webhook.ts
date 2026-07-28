import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { pagbankRequest, getPagbankToken } from '../_lib/pagbank';
import { verifyPagbankSignature } from '../_lib/webhookSignature';
import { signTicketPayload } from '../_lib/qr';
import { buildTicketPdf } from '../_lib/pdf';
import { sendTicketEmail } from '../_lib/email';

// Precisamos do corpo BRUTO (sem o Vercel parsear em JSON) para validar a
// assinatura do PagBank corretamente — ver _lib/webhookSignature.ts.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * POST /api/payments/webhook
 *
 * Recebido do PagBank. Regra de ouro: NUNCA confiar no corpo do webhook
 * isoladamente — validamos a assinatura E reconsultamos a API do PagBank
 * pelo id do pedido antes de gerar qualquer ingresso.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(200).end(); // o PagBank não gosta de erro aqui

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-authenticity-token'] as string | undefined;

    const valid = verifyPagbankSignature(rawBody, getPagbankToken(), signature);
    if (!valid) {
      console.warn('[webhook] assinatura inválida — notificação ignorada');
      return res.status(200).end();
    }

    const payload = JSON.parse(rawBody);
    const orderId: string | undefined = payload?.id;
    const externalReference: string | undefined = payload?.reference_id;

    if (!orderId || !externalReference) return res.status(200).end();

    // 1. Reconsulta o pedido diretamente na API do PagBank (nunca confia só no corpo recebido).
    const order = await pagbankRequest<{ charges?: { status: string }[] }>(`/orders/${orderId}`);
    const chargeStatus = order.charges?.[0]?.status; // PAID | DECLINED | CANCELED | WAITING | IN_ANALYSIS

    const paymentRef = db.collection('payments').doc(externalReference);

    await db.runTransaction(async (tx) => {
      const paySnap = await tx.get(paymentRef);
      if (!paySnap.exists) return;
      const payment = paySnap.data()!;

      // Idempotência: se já processamos esse pagamento como aprovado, não repete.
      if (payment.status === 'aprovado') return;

      const novoStatus =
        chargeStatus === 'PAID' ? 'aprovado' :
        chargeStatus === 'DECLINED' || chargeStatus === 'CANCELED' ? 'rejeitado' :
        'em_analise';

      tx.update(paymentRef, {
        status: novoStatus,
        pagbankOrderId: orderId,
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
    console.error('[webhook] erro ao processar notificação do PagBank:', err);
    // Retorna 200 mesmo em erro interno para evitar reenvios agressivos
    // enquanto o erro é investigado via logs — ajuste conforme sua política.
    return res.status(200).end();
  }
}
