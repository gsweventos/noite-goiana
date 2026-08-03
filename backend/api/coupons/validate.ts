import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { db } from '../_lib/firebaseAdmin';
import { validarCupom } from '../_lib/cupom';

const schema = z.object({
  codigo: z.string().min(1),
  eventoId: z.string().min(1),
  lotId: z.string().min(1),
});

/**
 * POST /api/coupons/validate
 *
 * Uso público (checkout) — devolve se o cupom é válido e o desconto
 * calculado, só pra MOSTRAR pro comprador antes de pagar. Essa resposta
 * NUNCA é usada como fonte de verdade pra cobrança: create-pix.ts e
 * create-preference.ts revalidam o cupom de novo, do zero, na hora de criar
 * o pagamento de verdade.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
  const { codigo, eventoId, lotId } = parsed.data;

  try {
    const eventSnap = await db.collection('events').doc(eventoId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: 'Evento não encontrado' });
    const lote = ((eventSnap.data()!.lotes as any[]) ?? []).find((l) => l.id === lotId);
    if (!lote) return res.status(404).json({ error: 'Lote não encontrado' });

    const resultado = await validarCupom(codigo, lotId, lote.preco);
    return res.json(resultado);
  } catch (err) {
    console.error('[coupons/validate] erro:', err);
    return res.status(500).json({ error: 'Não foi possível validar o cupom agora.' });
  }
}
