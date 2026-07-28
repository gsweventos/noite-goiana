import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { applyCors } from '../_lib/cors';
import { db, admin } from '../_lib/firebaseAdmin';
import { verifyTicketPayload } from '../_lib/qr';

const validateSchema = z.object({
  qrPayload: z.string().min(1),
  operadorId: z.string().min(1),
});

/**
 * POST /api/checkin/validate
 *
 * Único ponto de verdade sobre um ingresso ser válido ou não. O app de
 * check-in (frontend) só lê o QR Code com a câmera e envia o conteúdo bruto
 * para cá — toda decisão é tomada no servidor:
 *
 *   1. Verifica a assinatura HMAC do payload (evita QR Codes forjados);
 *   2. Busca o ingresso no Firestore pelo ticketId embutido no payload;
 *   3. Usa uma TRANSAÇÃO para checar e marcar "utilizado" atomicamente,
 *      prevenindo reuso mesmo com duas leituras simultâneas na mesma
 *      catraca (ou em catracas diferentes do mesmo evento).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ resultado: 'invalido' });

  const parsed = validateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ resultado: 'invalido' });

  const { qrPayload, operadorId } = parsed.data;
  const verification = verifyTicketPayload(qrPayload);

  if (!verification.valid || !verification.ticketId) {
    return res.json({ resultado: 'invalido' });
  }

  try {
    const ticketRef = db.collection('tickets').doc(verification.ticketId);

    const resultado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ticketRef);
      if (!snap.exists) return { resultado: 'invalido' as const };

      const ticket = snap.data()!;

      if (ticket.status === 'utilizado') {
        return {
          resultado: 'ja_utilizado' as const,
          ticket: { nome: ticket.compradorNome, evento: ticket.eventoNome, lote: ticket.lotNome, codigo: ticket.codigo },
        };
      }

      if (ticket.status === 'cancelado') {
        return { resultado: 'invalido' as const };
      }

      tx.update(ticketRef, {
        status: 'utilizado',
        utilizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        utilizadoPor: operadorId,
      });

      const checkinRef = db.collection('checkins').doc();
      tx.set(checkinRef, {
        ticketId: verification.ticketId,
        eventoId: ticket.eventoId,
        data: admin.firestore.FieldValue.serverTimestamp(),
        operadorId,
        resultado: 'autorizado',
      });

      return {
        resultado: 'autorizado' as const,
        ticket: { nome: ticket.compradorNome, evento: ticket.eventoNome, lote: ticket.lotNome, codigo: ticket.codigo },
      };
    });

    return res.json(resultado);
  } catch (err) {
    console.error('[checkin/validate] erro:', err);
    return res.status(500).json({ resultado: 'invalido' });
  }
}
