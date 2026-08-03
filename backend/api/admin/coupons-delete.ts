import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db } from '../_lib/firebaseAdmin';

const schema = z.object({ codigo: z.string().min(1) });

/** POST /api/admin/coupons-delete — apaga um cupom (endpoint exclusivo de admin). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem apagar cupons.' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    await db.collection('coupons').doc(parsed.data.codigo.trim().toUpperCase()).delete();
    return res.json({ ok: true });
  } catch (err) {
    console.error('[coupons-delete] erro:', err);
    return res.status(500).json({ error: 'Não foi possível apagar o cupom.' });
  }
}
