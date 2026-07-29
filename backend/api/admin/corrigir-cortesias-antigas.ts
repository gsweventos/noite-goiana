import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db } from '../_lib/firebaseAdmin';

/**
 * POST /api/admin/corrigir-cortesias-antigas
 *
 * Ferramenta de correção ÚNICA: encontra cortesias liberadas antes de
 * existir a reserva separada (event.cortesias) — ou seja, pagamentos com
 * origem "manual" mas ainda vinculados a um lote de venda de verdade — e:
 *   1. Devolve a quantidade pro lote (quantidadeVendida diminui)
 *   2. Soma na reserva de cortesias (cortesias.quantidadeUsada aumenta)
 *   3. Atualiza o pagamento e os ingressos pra apontar lotId "cortesia"
 *
 * É seguro rodar mais de uma vez: da segunda vez em diante, não encontra
 * mais nada pra corrigir (idempotente).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem rodar essa correção.' });

  try {
    const antigasSnap = await db
      .collection('payments')
      .where('origem', '==', 'manual')
      .get();

    const paraCorrigir = antigasSnap.docs.filter((doc) => doc.data().lotId && doc.data().lotId !== 'cortesia');

    if (paraCorrigir.length === 0) {
      return res.json({ ok: true, corrigidos: 0, mensagem: 'Nada para corrigir — todas as cortesias já estão no modelo novo.' });
    }

    // Agrupa por evento, pra mexer no documento do evento uma vez só por evento.
    const porEvento = new Map<string, typeof paraCorrigir>();
    for (const doc of paraCorrigir) {
      const eventoId = doc.data().eventoId as string;
      porEvento.set(eventoId, [...(porEvento.get(eventoId) ?? []), doc]);
    }

    let totalCorrigido = 0;

    for (const [eventoId, pagamentos] of porEvento) {
      await db.runTransaction(async (tx) => {
        const eventRef = db.collection('events').doc(eventoId);
        const eventSnap = await tx.get(eventRef);
        if (!eventSnap.exists) return;
        const evento = eventSnap.data()!;
        const lotes = [...(evento.lotes as any[])];
        const cortesias = evento.cortesias ?? { quantidadeTotal: 0, quantidadeUsada: 0 };
        let quantidadeASomar = 0;

        for (const pagamentoDoc of pagamentos) {
          const payment = pagamentoDoc.data();
          const loteIndex = lotes.findIndex((l) => l.id === payment.lotId);
          if (loteIndex !== -1) {
            lotes[loteIndex] = {
              ...lotes[loteIndex],
              quantidadeVendida: Math.max(0, lotes[loteIndex].quantidadeVendida - payment.quantidade),
            };
          }
          quantidadeASomar += payment.quantidade;

          tx.update(pagamentoDoc.ref, { lotId: 'cortesia' });
          totalCorrigido++;
        }

        tx.update(eventRef, {
          lotes,
          cortesias: { quantidadeTotal: cortesias.quantidadeTotal, quantidadeUsada: cortesias.quantidadeUsada + quantidadeASomar },
        });
      });

      // Ingressos: atualiza fora da transação principal (são muitos documentos
      // potencialmente espalhados, não precisam da mesma atomicidade do lote).
      for (const pagamentoDoc of pagamentos) {
        const ticketsSnap = await db.collection('tickets').where('paymentId', '==', pagamentoDoc.id).get();
        const batch = db.batch();
        ticketsSnap.docs.forEach((t) => batch.update(t.ref, { lotId: 'cortesia', lotNome: 'Cortesia' }));
        if (ticketsSnap.size > 0) await batch.commit();
      }
    }

    return res.json({ ok: true, corrigidos: totalCorrigido });
  } catch (err) {
    console.error('[corrigir-cortesias-antigas] erro:', err);
    return res.status(500).json({ error: 'Não foi possível corrigir as cortesias antigas.' });
  }
}
