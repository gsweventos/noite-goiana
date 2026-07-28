import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { confirmarPagamentoPorMpId } from '../_lib/confirmarPagamento';

/**
 * POST /api/payments/webhook
 *
 * Recebido do Mercado Pago. Regra de ouro: NUNCA confiar no corpo do webhook
 * isoladamente — sempre reconsultar a API do Mercado Pago pelo payment_id
 * para confirmar o status real antes de gerar qualquer ingresso (feito em
 * confirmarPagamentoPorMpId, compartilhado com o polling de status).
 *
 * Esse webhook é uma forma RÁPIDA de saber que algo mudou — mas não é a
 * única: o endpoint /payments/:id/status também confirma direto com o
 * Mercado Pago sempre que o comprador (ou o site, via polling) verifica o
 * status, então a compra se confirma mesmo se esta notificação atrasar ou
 * não chegar.
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

    await confirmarPagamentoPorMpId(paymentId);
    return res.status(200).end();
  } catch (err) {
    console.error('[webhook] erro ao processar notificação do Mercado Pago:', err);
    // Retorna 200 mesmo em erro interno para evitar reenvios agressivos do MP
    // enquanto o erro é investigado via logs — ajuste conforme sua política.
    return res.status(200).end();
  }
}
