import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { pagbankRequest } from '../_lib/pagbank';
import { onlyDigits, splitPhone } from '../_lib/format';

const createPreferenceSchema = z.object({
  eventoId: z.string().min(1),
  lotId: z.string().min(1),
  quantidade: z.number().int().min(1).max(6),
  comprador: z.object({
    nome: z.string().min(3),
    cpf: z.string().min(11),
    email: z.string().email(),
    telefone: z.string().min(8),
  }),
});

/**
 * POST /api/payments/create-preference
 *
 * Cria um registro de pagamento "pendente" no Firestore e um Checkout no
 * PagBank. O frontend recebe apenas a URL de pagamento (equivalente ao
 * "initPoint" do Mercado Pago) — o Access Token nunca sai do backend.
 *
 * A confirmação real do pagamento NUNCA acontece aqui: ela só é aceita via
 * webhook (ver payments/webhook.ts), reconsultando a API do PagBank.
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

    // 1. Cria o registro de pagamento como "pendente" ANTES de falar com o PagBank.
    const paymentRef = db.collection('payments').doc();
    await paymentRef.set({
      eventoId,
      lotId,
      quantidade,
      compradorNome: comprador.nome,
      compradorCpf: comprador.cpf,
      compradorEmail: comprador.email,
      compradorTelefone: comprador.telefone,
      valorTotal,
      status: 'pendente',
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Cria o Checkout no PagBank.
    const appUrl = process.env.PUBLIC_APP_URL ?? 'https://www.noitegoiana.com.br';
    const apiUrl = process.env.PUBLIC_API_URL;
    const { area, number } = splitPhone(comprador.telefone);

    const checkout = await pagbankRequest<{ id: string; links: { rel: string; href: string }[] }>('/checkouts', {
      method: 'POST',
      body: {
        reference_id: paymentRef.id,
        customer: {
          name: comprador.nome,
          email: comprador.email,
          tax_id: onlyDigits(comprador.cpf),
          phone: { country: '55', area, number },
        },
        customer_modifiable: true,
        items: [
          {
            reference_id: lotId,
            name: `${evento.nome} — ${lote.nome}`,
            quantity: quantidade,
            unit_amount: Math.round(lote.preco * 100), // PagBank trabalha em centavos
          },
        ],
        payment_notification_urls: [`${apiUrl}/payments/webhook`],
        return_url: `${appUrl}/`,
      },
    });

    const payLink = checkout.links.find((l) => l.rel === 'PAY')?.href;
    if (!payLink) throw new Error('PagBank não retornou o link de pagamento.');

    await paymentRef.update({ pagbankCheckoutId: checkout.id });

    return res.json({
      preferenceId: checkout.id,
      initPoint: payLink,
      paymentId: paymentRef.id,
    });
  } catch (err) {
    console.error('[create-preference] erro:', err);
    return res.status(500).json({ error: 'Não foi possível iniciar o pagamento.' });
  }
}
