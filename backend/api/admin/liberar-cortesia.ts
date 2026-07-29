import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db } from '../_lib/firebaseAdmin';
import { liberarCortesia } from '../_lib/confirmarPagamento';

const schema = z.object({
  eventoId: z.string().min(1),
  lotId: z.string().min(1),
  quantidade: z.number().int().min(1).max(20),
  comprador: z.object({
    nome: z.string().min(3),
    cpf: z.string().min(11),
    email: z.string().email(),
    telefone: z.string().min(8),
    dataNascimento: z.string().optional(),
  }),
  motivo: z.string().optional(),
});

/**
 * POST /api/admin/liberar-cortesia
 *
 * Endpoint EXCLUSIVO para administradores logados (verificado via token do
 * Firebase, ver _lib/verificarAdmin.ts) — gera ingresso(s) sem cobrar nada,
 * usado para cortesias. O ingresso final é idêntico a um comprado (QR Code,
 * aparece no painel do destinatário, e-mail se o SMTP estiver configurado).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem liberar cortesias.' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
  }
  const { eventoId, lotId, quantidade, comprador, motivo } = parsed.data;

  try {
    const eventSnap = await db.collection('events').doc(eventoId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: 'Evento não encontrado' });
    const evento = eventSnap.data()!;
    const lote = (evento.lotes as any[]).find((l) => l.id === lotId);
    if (!lote) return res.status(404).json({ error: 'Lote não encontrado' });

    const disponiveis = lote.quantidadeTotal - lote.quantidadeVendida;
    if (disponiveis < quantidade) {
      return res.status(409).json({ error: 'Quantidade indisponível para este lote' });
    }

    const paymentId = await liberarCortesia({
      eventoId,
      lotId,
      quantidade,
      comprador,
      motivo,
      liberadoPor: adminUid,
    });

    return res.json({ paymentId });
  } catch (err) {
    console.error('[liberar-cortesia] erro:', err);
    return res.status(500).json({ error: 'Não foi possível liberar a cortesia.' });
  }
}
