import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';
import { mpPreference, mpPayment } from './mercadopago';
import { signTicketPayload } from './qr';
import { buildTicketPdf } from './pdf';
import { sendTicketEmail } from './email';

export const paymentsRouter = Router();

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
 * POST /payments/create-preference
 *
 * Cria um registro de pagamento "pendente" no Firestore e uma preference
 * no Mercado Pago (Checkout Pro). O frontend recebe apenas o `initPoint`
 * (URL de checkout) — o Access Token nunca sai do backend.
 *
 * A confirmação real do pagamento NUNCA acontece aqui: ela só é aceita
 * via webhook (ver POST /payments/webhook), consultando a API do MP.
 */
paymentsRouter.post('/create-preference', async (req, res) => {
  const parsed = createPreferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
  }
  const { eventoId, lotId, quantidade, comprador } = parsed.data;

  const db = admin.firestore();
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
      },
      external_reference: paymentRef.id,
      notification_url: `${apiUrl}/payments/webhook`,
      back_urls: {
        // O frontend usa HashRouter (funciona em qualquer domínio/subpasta sem
        // configuração extra), então as rotas internas levam um "#" antes do caminho.
        success: `${appUrl}/#/painel`,
        pending: `${appUrl}/#/painel`,
        failure: `${appUrl}/#/checkout`,
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
});

/**
 * GET /payments/:id/status
 * Usado pelo frontend para exibir o status atual de um pagamento (polling leve),
 * já refletindo o que o webhook confirmou no Firestore.
 */
paymentsRouter.get('/:id/status', async (req, res) => {
  const db = admin.firestore();
  const snap = await db.collection('payments').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Pagamento não encontrado' });

  const data = snap.data()!;
  const ticketsSnap = await db.collection('tickets').where('paymentId', '==', req.params.id).get();

  return res.json({
    status: data.status,
    ticketIds: ticketsSnap.docs.map((d) => d.id),
  });
});

/**
 * POST /payments/webhook
 *
 * Recebido do Mercado Pago. Regra de ouro: NUNCA confiar no corpo do webhook
 * isoladamente — sempre reconsultar a API do Mercado Pago pelo payment_id
 * para confirmar o status real antes de gerar qualquer ingresso.
 */
paymentsRouter.post('/webhook', async (req, res) => {
  try {
    const paymentId = req.body?.data?.id ?? req.query['data.id'];
    const topic = req.body?.type ?? req.query.type;

    if (topic !== 'payment' || !paymentId) {
      // Outros tipos de notificação (merchant_order, etc.) são apenas confirmados.
      return res.sendStatus(200);
    }

    // 1. Reconsulta o pagamento diretamente na API do Mercado Pago.
    const mpData = await mpPayment.get({ id: paymentId });
    const externalReference = mpData.external_reference; // == paymentRef.id no Firestore
    const status = mpData.status; // approved | pending | rejected | ...

    if (!externalReference) return res.sendStatus(200);

    const db = admin.firestore();
    const paymentRef = db.collection('payments').doc(externalReference);

    await db.runTransaction(async (tx) => {
      const paySnap = await tx.get(paymentRef);
      if (!paySnap.exists) return;
      const payment = paySnap.data()!;

      // Idempotência: se já processamos esse pagamento como aprovado, não repete.
      if (payment.status === 'aprovado') return;

      const novoStatus =
        status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'em_analise';

      tx.update(paymentRef, {
        status: novoStatus,
        mpPaymentId: String(paymentId),
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (novoStatus !== 'aprovado') return;

      // 2. Pagamento aprovado: debita o lote e gera os ingressos DENTRO da transação,
      //    para nunca vender além da quantidade disponível mesmo sob concorrência.
      const eventRef = db.collection('events').doc(payment.eventoId);
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) return;
      const evento = eventSnap.data()!;
      const lotes = evento.lotes as any[];
      const loteIndex = lotes.findIndex((l) => l.id === payment.lotId);
      if (loteIndex === -1) return;

      lotes[loteIndex] = {
        ...lotes[loteIndex],
        quantidadeVendida: lotes[loteIndex].quantidadeVendida + payment.quantidade,
      };
      tx.update(eventRef, { lotes });

      const ticketIds: string[] = [];
      for (let i = 0; i < payment.quantidade; i++) {
        const ticketId = uuidv4();
        const qrPayload = signTicketPayload(ticketId, payment.eventoId);
        const ticketRef = db.collection('tickets').doc(ticketId);
        tx.set(ticketRef, {
          codigo: `NG-${ticketId.slice(0, 6).toUpperCase()}`,
          qrPayload,
          eventoId: payment.eventoId,
          eventoNome: evento.nome,
          lotId: payment.lotId,
          lotNome: lotes[loteIndex].nome,
          compradorNome: payment.compradorNome,
          compradorCpf: payment.compradorCpf,
          compradorEmail: payment.compradorEmail,
          numero: i + 1,
          status: 'valido',
          criadoEm: admin.firestore.FieldValue.serverTimestamp(),
          paymentId: externalReference,
        });
        ticketIds.push(ticketId);
      }

      tx.update(paymentRef, { ticketIds });
    });

    // 3. Fora da transação: gera o(s) PDF(s) e envia por e-mail (não bloqueia a confirmação).
    const finalPaySnap = await paymentRef.get();
    const payment = finalPaySnap.data();
    if (payment?.status === 'aprovado' && payment.ticketIds?.length) {
      const eventSnap = await db.collection('events').doc(payment.eventoId).get();
      const evento = eventSnap.data()!;
      for (const ticketId of payment.ticketIds as string[]) {
        const ticketSnap = await db.collection('tickets').doc(ticketId).get();
        const ticket = ticketSnap.data()!;
        const pdf = await buildTicketPdf({
          eventoNome: evento.nome,
          local: `${evento.local.local}, ${evento.local.cidade} - ${evento.local.estado}`,
          dataFormatada: new Date(evento.dataInicio).toLocaleString('pt-BR'),
          compradorNome: ticket.compradorNome,
          codigo: ticket.codigo,
          qrPayload: ticket.qrPayload,
        });
        await sendTicketEmail({
          to: ticket.compradorEmail,
          nomeComprador: ticket.compradorNome,
          eventoNome: evento.nome,
          pdfBuffer: pdf,
        });
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('[webhook] erro ao processar notificação do Mercado Pago', err);
    // Retorna 200 mesmo em erro interno para evitar reenvios agressivos do MP
    // enquanto o erro é investigado via logs — ajuste conforme sua política.
    return res.sendStatus(200);
  }
});
