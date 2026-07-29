import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { mpPreference } from '../_lib/mercadopago';

const createPreferenceSchema = z.object({
  eventoId: z.string().min(1),
  lotId: z.string().min(1),
  quantidade: z.number().int().min(1).max(6),
  comprador: z.object({
    nome: z.string().min(3),
    cpf: z.string().min(11),
    email: z.string().email(),
    telefone: z.string().min(8),
    dataNascimento: z.string().min(8),
  }),
});

/**
 * POST /api/payments/create-preference
 *
 * Cria um registro de pagamento "pendente" no Firestore e uma preference no
 * Mercado Pago (Checkout Pro). O frontend recebe apenas o `initPoint` (URL de
 * checkout) — o Access Token nunca sai do backend.
 *
 * A confirmação real do pagamento NUNCA acontece aqui: ela só é aceita via
 * webhook (ver payments/webhook.ts), consultando a API do MP.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const parsed = createPreferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
  }
  const { eventoId, lotId, quantidade, comprador } = parsed.data;

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

    const valorTotal = lote.preco * quantidade;

    // 1. Cria o registro de pagamento como "pendente" ANTES de falar com o Mercado Pago.
    const paymentRef = db.collection('payments').doc();
    await paymentRef.set({
      eventoId,
      lotId,
      quantidade,
      compradorNome: comprador.nome,
      compradorCpf: comprador.cpf,
      compradorEmail: comprador.email,
      compradorTelefone: comprador.telefone,
      compradorDataNascimento: comprador.dataNascimento,
      valorTotal,
      status: 'pendente',
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Cria a preference no Mercado Pago (Checkout Pro).
    const appUrl = process.env.PUBLIC_APP_URL ?? 'https://www.noitegoiana.com.br';
    const apiUrl = process.env.PUBLIC_API_URL;

    const preference = await mpPreference.create({
      body: {
        items: [
          {
            id: lotId,
            title: `${evento.nome} — ${lote.nome}`,
            quantity: quantidade,
            unit_price: lote.preco,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: comprador.nome,
          email: comprador.email,
          identification: {
            type: 'CPF',
            number: comprador.cpf.replace(/\D/g, ''),
          },
        },
        external_reference: paymentRef.id,
        notification_url: `${apiUrl}/payments/webhook`,
        back_urls: {
          // O Mercado Pago não aceita "#" nas URLs de retorno (nosso
          // frontend usa HashRouter), então voltamos para a raiz do site —
          // o próprio frontend detecta o retorno e leva o usuário para
          // /painel automaticamente (ver App.tsx / Home.tsx do frontend).
          success: `${appUrl}/`,
          pending: `${appUrl}/`,
          failure: `${appUrl}/`,
        },
        auto_return: 'approved',
        statement_descriptor: 'NOITEGOIANA',
      },
    });

    await paymentRef.update({ mpPreferenceId: preference.id });

    return res.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      paymentId: paymentRef.id,
    });
  } catch (err) {
    console.error('[create-preference] erro:', err);
    return res.status(500).json({ error: 'Não foi possível iniciar o pagamento.' });
  }
}
