import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db } from '../_lib/firebaseAdmin';

const schema = z.object({ ticketId: z.string().min(1) });

/**
 * POST /api/admin/delete-ticket
 *
 * Apaga um único ingresso (sem mexer no pagamento nem nos outros ingressos
 * da mesma compra, se houver mais de um). Devolve a vaga pro lote
 * (quantidadeVendida diminui em 1). Útil pra apagar um ingresso de teste
 * específico, ou uma cortesia liberada por engano.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem apagar registros.' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
  const { ticketId } = parsed.data;

  try {
    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) return res.status(404).json({ error: 'Ingresso não encontrado' });
    const ticket = ticketSnap.data()!;

    const batch = db.batch();
    batch.delete(ticketRef);

    const eventRef = db.collection('events').doc(ticket.eventoId);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
      const evento = eventSnap.data()!;
      const lotes = evento.lotes as any[];
      const loteIndex = lotes.findIndex((l) => l.id === ticket.lotId);
      if (loteIndex !== -1) {
        lotes[loteIndex] = {
          ...lotes[loteIndex],
          quantidadeVendida: Math.max(0, lotes[loteIndex].quantidadeVendida - 1),
        };
        batch.update(eventRef, { lotes });
      }
    }

    // Tira o id desse ingresso da lista guardada no pagamento, se existir.
    if (ticket.paymentId) {
      const paymentRef = db.collection('payments').doc(ticket.paymentId);
      const paymentSnap = await paymentRef.get();
      if (paymentSnap.exists) {
        const ticketIds = (paymentSnap.data()!.ticketIds ?? []) as string[];
        batch.update(paymentRef, { ticketIds: ticketIds.filter((id) => id !== ticketId) });
      }
    }

    await batch.commit();
    return res.json({ ok: true });
  } catch (err) {
    console.error('[delete-ticket] erro:', err);
    return res.status(500).json({ error: 'Não foi possível apagar o ingresso.' });
  }
}
