import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

/**
 * Geração do payload do QR Code.
 *
 * IMPORTANTE — modelo de segurança real:
 * O payload nunca deve ser "apenas o UUID do ingresso" em texto puro, pois isso
 * permitiria forjar QR Codes válidos. Em produção, o payload é montado e ASSINADO
 * no backend (Cloud Function), usando HMAC-SHA256 com um segredo que nunca chega
 * ao frontend:
 *
 *   payload = `${ticketId}.${timestamp}`
 *   assinatura = HMAC_SHA256(payload, QR_SECRET)
 *   conteúdo do QR = `${payload}.${assinatura}`
 *
 * A leitura (checkinService) reenvia esse conteúdo para o backend, que recalcula
 * a assinatura e só considera o ingresso válido se ela bater — e, mesmo assim,
 * a decisão final de "já utilizado" é sempre feita a partir do Firestore (nunca
 * confiando no conteúdo do QR isoladamente).
 *
 * Aqui no frontend (modo mock/demo) simulamos esse formato para manter a mesma
 * interface visual e de fluxo.
 */
export function buildTicketId(): string {
  return uuidv4();
}

export function buildShortCode(): string {
  return `NG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function buildQrPayload(ticketId: string, eventoId: string): string {
  const timestamp = Date.now();
  // Em produção: assinatura HMAC real feita no backend. Aqui, placeholder ilustrativo.
  const fakeSig = btoa(`${ticketId}:${eventoId}:${timestamp}`).slice(0, 12);
  return `NG:${ticketId}:${eventoId}:${fakeSig}`;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 480,
    color: { dark: '#0A0510FF', light: '#FFFFFFFF' },
  });
}
