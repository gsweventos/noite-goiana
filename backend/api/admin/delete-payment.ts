import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db } from '../_lib/firebaseAdmin';

const schema = z.object({ paymentId: z.string().min(1) });

/**
 * POST /api/admin/delete-payment
 *
 * Apaga um pagamento E todos os ingressos gerados a partir dele (mantém o
 * banco consistente — não faz sentido sobrar ingresso "órfão" sem o
 * pagamento que o originou). Se o pagamento estava aprovado, devolve a
 * quantidade pro lote (quantidadeVendida diminui), já que esses ingressos
 * deixam de existir. Útil pra limpar compras de teste.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem apagar registros.' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
  const { paymentId } = parsed.data;

  try {
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) return res.status(404).json({ error: 'Pagamento não encontrado' });
    const payment = paymentSnap.data()!;

    const ticketsSnap = await db.collection('tickets').where('paymentId', '==', paymentId).get();

    const batch = db.batch();
    ticketsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(paymentRef);

    // Se o pagamento estava aprovado, os ingressos de fato "ocuparam vaga"
    // (num lote, se foi compra normal, ou na reserva de cortesias, se foi
    // liberado manualmente) — devolve essa quantidade agora que eles deixam
    // de existir.
    if (payment.status === 'aprovado' && ticketsSnap.size > 0) {
      const eventRef = db.collection('events').doc(payment.eventoId);
      const eventSnap = await eventRef.get();
      if (eventSnap.exists) {
        const evento = eventSnap.data()!;
        if (payment.origem === 'manual') {
          const cortesias = evento.cortesias ?? { quantidadeTotal: 0, quantidadeUsada: 0 };
          batch.update(eventRef, {
            cortesias: { ...cortesias, quantidadeUsada: Math.max(0, cortesias.quantidadeUsada - ticketsSnap.size) },
          });
        } else {
          const lotes = evento.lotes as any[];
          const loteIndex = lotes.findIndex((l) => l.id === payment.lotId);
          if (loteIndex !== -1) {
            lotes[loteIndex] = {
              ...lotes[loteIndex],
              quantidadeVendida: Math.max(0, lotes[loteIndex].quantidadeVendida - ticketsSnap.size),
            };
            batch.update(eventRef, { lotes });
          }
        }
      }
    }

    await batch.commit();
    return res.json({ ok: true, ingressosApagados: ticketsSnap.size });
  } catch (err) {
    console.error('[delete-payment] erro:', err);
    return res.status(500).json({ error: 'Não foi possível apagar o pagamento.' });
  }
}
