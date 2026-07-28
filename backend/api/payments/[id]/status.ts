import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib/cors';
import { db } from '../../_lib/firebaseAdmin';

/**
 * GET /api/payments/:id/status
 * Usado pelo frontend para exibir o status atual de um pagamento (polling
 * leve), já refletindo o que o webhook confirmou no Firestore.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const id = req.query.id as string;

  try {
    const snap = await db.collection('payments').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const data = snap.data()!;
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
