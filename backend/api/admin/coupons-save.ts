import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db, admin } from '../_lib/firebaseAdmin';

const schema = z.object({
  codigo: z.string().min(2).max(30),
  tipo: z.enum(['percentual', 'fixo']),
  valor: z.number().positive(),
  ativo: z.boolean(),
  usosMaximos: z.number().int().positive().optional(),
  validoAte: z.string().optional(),
  lotesAplicaveis: z.array(z.string()).optional(),
});

/**
 * POST /api/admin/coupons-save
 *
 * Cria (ou edita, se o código já existir) um cupom de desconto. Endpoint
 * exclusivo de admin — o documento fica salvo com o próprio código (em
 * maiúsculas) como id, então salvar de novo com o mesmo código só atualiza.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons.' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });

  const { codigo, tipo, valor, ativo, usosMaximos, validoAte, lotesAplicaveis } = parsed.data;
  const id = codigo.trim().toUpperCase();

  if (tipo === 'percentual' && valor > 100) {
    return res.status(400).json({ error: 'Desconto percentual não pode passar de 100%.' });
  }

  try {
    const ref = db.collection('coupons').doc(id);
    const existente = await ref.get();

    await ref.set(
      {
        codigo: id,
        tipo,
        valor,
        ativo,
        usosMaximos: usosMaximos ?? null,
        usosAtuais: existente.exists ? (existente.data()!.usosAtuais ?? 0) : 0,
        validoAte: validoAte || null,
        lotesAplicaveis: lotesAplicaveis?.length ? lotesAplicaveis : null,
        criadoEm: existente.exists ? existente.data()!.criadoEm : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: false }
    );

    return res.json({ ok: true, codigo: id });
  } catch (err) {
    console.error('[coupons-save] erro:', err);
    return res.status(500).json({ error: 'Não foi possível salvar o cupom.' });
  }
}
