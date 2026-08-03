import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { verificarAdmin } from '../_lib/verificarAdmin';
import { db, admin } from '../_lib/firebaseAdmin';

const saveSchema = z.object({
  codigo: z.string().min(2).max(30),
  tipo: z.enum(['percentual', 'fixo']),
  valor: z.number().positive(),
  ativo: z.boolean(),
  usosMaximos: z.number().int().positive().optional(),
  validoAte: z.string().optional(),
  lotesAplicaveis: z.array(z.string()).optional(),
});

const deleteSchema = z.object({ codigo: z.string().min(1) });

/**
 * POST /api/admin/coupons — cria ou edita um cupom (mesmo formato de antes)
 * DELETE /api/admin/coupons — apaga um cupom
 *
 * Os dois juntos num arquivo só (o plano gratuito do Vercel tem limite de
 * 12 funções por deploy) — diferenciados pelo método HTTP.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const adminUid = await verificarAdmin(req);
  if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons.' });

  if (req.method === 'DELETE') {
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
    try {
      await db.collection('coupons').doc(parsed.data.codigo.trim().toUpperCase()).delete();
      return res.json({ ok: true });
    } catch (err) {
      console.error('[coupons delete] erro:', err);
      return res.status(500).json({ error: 'Não foi possível apagar o cupom.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const parsed = saveSchema.safeParse(req.body);
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
    console.error('[coupons save] erro:', err);
    return res.status(500).json({ error: 'Não foi possível salvar o cupom.' });
  }
}
