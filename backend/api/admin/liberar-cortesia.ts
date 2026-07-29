import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { liberarCortesia } from '../_lib/confirmarPagamento';

const schema = z.object({
  eventoId: z.string().min(1),
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
 * usado para cortesias. Usa uma reserva própria (event.cortesias),
 * independente dos lotes de venda — não desconta deles nem aparece pro
 * público. O ingresso final é idêntico a um comprado (QR Code, aparece no
 * painel do destinatário, e-mail se o SMTP estiver configurado).
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
  const { eventoId, quantidade, comprador, motivo } = parsed.data;

  try {
    const paymentId = await liberarCortesia({
      eventoId,
      quantidade,
      comprador,
      motivo,
      liberadoPor: adminUid,
    });

    return res.json({ paymentId });
  } catch (err) {
    console.error('[liberar-cortesia] erro:', err);
    const message = err instanceof Error ? err.message : 'Não foi possível liberar a cortesia.';
    return res.status(409).json({ error: message });
  }
}
