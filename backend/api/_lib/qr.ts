import crypto from 'crypto';
import QRCode from 'qrcode';

const QR_SECRET = process.env.QR_SECRET ?? '';

/**
 * Monta e assina (HMAC-SHA256) o payload de um QR Code de ingresso.
 * Formato: NG:<ticketId>:<eventoId>:<timestamp>:<assinatura>
 *
 * A assinatura garante que ninguém consegue forjar um QR Code válido
 * sem conhecer QR_SECRET — que existe só no backend.
 */
export function signTicketPayload(ticketId: string, eventoId: string): string {
  const timestamp = Date.now();
  const base = `${ticketId}:${eventoId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', QR_SECRET).update(base).digest('hex').slice(0, 16);
  return `NG:${base}:${signature}`;
}

/** Reconstrói e valida a assinatura de um payload lido da câmera no check-in. */
export function verifyTicketPayload(payload: string): { valid: boolean; ticketId?: string; eventoId?: string } {
  const parts = payload.split(':');
  if (parts.length !== 5 || parts[0] !== 'NG') return { valid: false };

  const [, ticketId, eventoId, timestamp, signature] = parts;
  const base = `${ticketId}:${eventoId}:${timestamp}`;
  const expected = crypto.createHmac('sha256', QR_SECRET).update(base).digest('hex').slice(0, 16);

  // Comparação em tempo constante para evitar timing attacks.
  const valid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  return valid ? { valid: true, ticketId, eventoId } : { valid: false };
}

export async function generateQrPngBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, { margin: 1, width: 480 });
}
