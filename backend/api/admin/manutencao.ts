import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db } from '../_lib/firebaseAdmin';

const schema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('apagar-pagamento'), paymentId: z.string().min(1) }),
  z.object({ acao: z.literal('apagar-ingresso'), ticketId: z.string().min(1) }),
  z.object({ acao: z.literal('corrigir-cortesias-antigas') }),
]);

/**
 * POST /api/admin/manutencao
 *
 * Ações administrativas de manutenção, todas num arquivo só (o plano
 * gratuito do Vercel tem limite de 12 funções por deploy — juntamos aqui em
 * vez de um arquivo por ação). Cada ação continua com a mesma lógica de
 * antes, só reorganizada.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem fazer isso.' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });

  try {
    if (parsed.data.acao === 'apagar-pagamento') return await apagarPagamento(parsed.data.paymentId, res);
    if (parsed.data.acao === 'apagar-ingresso') return await apagarIngresso(parsed.data.ticketId, res);
    return await corrigirCortesiasAntigas(res);
  } catch (err) {
    console.error('[manutencao] erro:', err);
    return res.status(500).json({ error: 'Não foi possível completar a ação.' });
  }
}

/**
 * Apaga um pagamento E todos os ingressos gerados a partir dele. Se o
 * pagamento estava aprovado, devolve a quantidade pro lote (ou pra reserva
 * de cortesias, se foi liberado manualmente).
 */
async function apagarPagamento(paymentId: string, res: VercelResponse) {
  const paymentRef = db.collection('payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) return res.status(404).json({ error: 'Pagamento não encontrado' });
  const payment = paymentSnap.data()!;

  const ticketsSnap = await db.collection('tickets').where('paymentId', '==', paymentId).get();

  const batch = db.batch();
  ticketsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(paymentRef);

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
}

/** Apaga um único ingresso (sem mexer no pagamento nem nos outros ingressos da mesma compra). */
async function apagarIngresso(ticketId: string, res: VercelResponse) {
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
    if (ticket.origem === 'manual') {
      const cortesias = evento.cortesias ?? { quantidadeTotal: 0, quantidadeUsada: 0 };
      batch.update(eventRef, {
        cortesias: { ...cortesias, quantidadeUsada: Math.max(0, cortesias.quantidadeUsada - 1) },
      });
    } else {
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
  }

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
}

/**
 * Ferramenta de correção ÚNICA: encontra cortesias liberadas antes de
 * existir a reserva separada (event.cortesias) e migra pro modelo novo.
 * Seguro rodar mais de uma vez (idempotente).
 */
async function corrigirCortesiasAntigas(res: VercelResponse) {
  const antigasSnap = await db.collection('payments').where('origem', '==', 'manual').get();
  const paraCorrigir = antigasSnap.docs.filter((doc) => doc.data().lotId && doc.data().lotId !== 'cortesia');

  if (paraCorrigir.length === 0) {
    return res.json({ ok: true, corrigidos: 0, mensagem: 'Nada para corrigir — todas as cortesias já estão no modelo novo.' });
  }

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

    for (const pagamentoDoc of pagamentos) {
      const ticketsSnap = await db.collection('tickets').where('paymentId', '==', pagamentoDoc.id).get();
      const batch = db.batch();
      ticketsSnap.docs.forEach((t) => batch.update(t.ref, { lotId: 'cortesia', lotNome: 'Cortesia' }));
      if (ticketsSnap.size > 0) await batch.commit();
    }
  }

  return res.json({ ok: true, corrigidos: totalCorrigido });
}
