import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib/cors';
import { db } from '../../_lib/firebaseAdmin';
import { buildTicketPdf } from '../../_lib/pdf';

/**
 * GET /api/tickets/:id/pdf
 *
 * Gera o PDF do ingresso na hora e devolve pronto pra download — usado pelo
 * botão "Baixar PDF" no painel do cliente. É a mesma geração usada no
 * e-mail automático (ver _lib/pdf.ts), só que sob demanda.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const ticketId = req.query.id as string;

  try {
    const ticketSnap = await db.collection('tickets').doc(ticketId).get();
    if (!ticketSnap.exists) return res.status(404).json({ error: 'Ingresso não encontrado' });
    const ticket = ticketSnap.data()!;

    const eventSnap = await db.collection('events').doc(ticket.eventoId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: 'Evento não encontrado' });
    const evento = eventSnap.data()!;

    const pdf = await buildTicketPdf({
      eventoNome: evento.nome,
      local: `${evento.local.local}, ${evento.local.cidade} - ${evento.local.estado}`,
      dataFormatada: new Date(evento.dataInicio).toLocaleString('pt-BR'),
      compradorNome: ticket.compradorNome,
      codigo: ticket.codigo,
      qrPayload: ticket.qrPayload,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ingresso-${ticket.codigo}.pdf"`);
    return res.status(200).send(pdf);
  } catch (err) {
    console.error('[tickets/pdf] erro:', err);
    return res.status(500).json({ error: 'Não foi possível gerar o PDF.' });
  }
}
