import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { mpAccessToken } from '../_lib/mercadopago';
import { precoComTaxa } from '../_lib/pricing';
import { validarCupom } from '../_lib/cupom';

const createPixSchema = z.object({
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
  deviceId: z.string().optional(),
  cupom: z.string().optional(),
});

/**
 * POST /api/payments/create-pix
 *
 * Gera um pagamento Pix DIRETO pela API de Pagamentos do Mercado Pago (em vez
 * do Checkout Pro com redirecionamento) — o comprador nunca sai do nosso
 * site, e a gente mostra o QR Code/código copia-e-cola aqui mesmo.
 *
 * Mesma regra de sempre: a confirmação definitiva do pagamento só acontece
 * via webhook (ver payments/webhook.ts), nunca por essa resposta isolada.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const parsed = createPixSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
  }
  const { eventoId, lotId, quantidade, comprador, deviceId, cupom } = parsed.data;

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

    // Revalida o cupom do ZERO no servidor (nunca confia em desconto vindo do
    // frontend) — se o código não existir mais/for inválido, a compra segue
    // sem desconto em vez de travar o pagamento.
    const resultadoCupom = cupom ? await validarCupom(cupom, lotId, lote.preco) : null;
    const precoBaseFinal = resultadoCupom?.valido ? resultadoCupom.precoBaseComDesconto! : lote.preco;
    const descontoUnitario = resultadoCupom?.valido ? resultadoCupom.descontoUnitario! : 0;

    const valorTotal = precoComTaxa(precoBaseFinal) * quantidade;

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
      ...(resultadoCupom?.valido
        ? { cupomCodigo: resultadoCupom.cupom!.codigo, descontoAplicado: descontoUnitario * quantidade }
        : {}),
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Cria o pagamento Pix direto na API do Mercado Pago. Chamamos a API
    // diretamente (sem o SDK) aqui porque o SDK de Node não tem um jeito
    // tipado de mandar o header x-meli-session-id do Device ID — assim
    // controlamos os headers manualmente, do mesmo jeito que já confirmamos
    // funcionar direto com curl.
    const apiUrl = process.env.PUBLIC_API_URL;
    const [firstName, ...restName] = comprador.nome.trim().split(/\s+/);
    const lastName = restName.join(' ') || firstName;

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpAccessToken}`,
        'X-Idempotency-Key': paymentRef.id,
        ...(deviceId ? { 'X-meli-session-id': deviceId } : {}),
      },
      body: JSON.stringify({
        transaction_amount: valorTotal,
        description: `${evento.nome} — ${lote.nome}`,
        payment_method_id: 'pix',
        external_reference: paymentRef.id,
        notification_url: `${apiUrl}/payments/webhook`,
        payer: {
          email: comprador.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: comprador.cpf.replace(/\D/g, ''),
          },
        },
      }),
    });

    const mpPaymentResult = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[create-pix] Mercado Pago recusou a criação do pagamento:', mpPaymentResult);
      throw new Error(mpPaymentResult?.message ?? 'Mercado Pago recusou a criação do pagamento.');
    }

    const txData = mpPaymentResult.point_of_interaction?.transaction_data;
    if (!txData?.qr_code || !txData?.qr_code_base64) {
      throw new Error('Mercado Pago não retornou o QR Code Pix.');
    }

    await paymentRef.update({ mpPaymentId: String(mpPaymentResult.id) });

    return res.json({
      paymentId: paymentRef.id,
      mpPaymentId: mpPaymentResult.id,
      qrCode: txData.qr_code, // código "copia e cola"
      qrCodeBase64: txData.qr_code_base64, // imagem do QR Code, em base64
      ticketUrl: txData.ticket_url,
      expiraEm: mpPaymentResult.date_of_expiration,
    });
  } catch (err) {
    console.error('[create-pix] erro:', err);
    return res.status(500).json({ error: 'Não foi possível gerar o Pix. Tente novamente em instantes.' });
  }
}
