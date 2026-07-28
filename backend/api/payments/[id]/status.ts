import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib/cors';
import { db } from '../../_lib/firebaseAdmin';
import { confirmarPagamentoPorMpId } from '../../_lib/confirmarPagamento';

/**
 * GET /api/payments/:id/status
 *
 * Usado pelo frontend para exibir o status atual de um pagamento (polling
 * enquanto o comprador espera na tela do Pix).
 *
 * Importante: além de ler o Firestore, esse endpoint também RECONFIRMA
 * direto com o Mercado Pago (se o pagamento ainda não estiver aprovado) —
 * assim, mesmo que o webhook do Mercado Pago atrase ou não chegue, a compra
 * se confirma assim que o comprador estiver esperando na tela, sem
 * depender só da notificação automática.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const id = req.query.id as string;

  try {
    let snap = await db.collection('payments').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Pagamento não encontrado' });

    let data = snap.data()!;

    // Se ainda não está aprovado e já temos o id do pagamento no Mercado
    // Pago, reconsulta agora — não espera só pelo webhook.
    if (data.status !== 'aprovado' && data.mpPaymentId) {
      try {
        await confirmarPagamentoPorMpId(data.mpPaymentId);
        snap = await db.collection('payments').doc(id).get();
        data = snap.data()!;
      } catch (err) {
        // Se a reconsulta falhar, ainda respondemos com o status que já
        // tínhamos no Firestore — não trava a experiência do comprador.
        console.error('[payments/status] falha ao reconfirmar com o Mercado Pago:', err);
      }
    }

    const ticketsSnap = await db.collection('tickets').where('paymentId', '==', id).get();

    return res.json({
      status: data.status,
      ticketIds: ticketsSnap.docs.map((d) => d.id),
    });
  } catch (err) {
    console.error('[payments/status] erro:', err);
    return res.status(500).json({ error: 'Não foi possível consultar o pagamento.' });
  }
}
