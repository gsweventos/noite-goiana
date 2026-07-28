import crypto from 'crypto';

/**
 * O PagBank assina cada notificação de webhook com SHA-256 sobre
 * `{token}-{corpo_bruto_da_requisição}`, enviado no header
 * `x-authenticity-token`. Precisamos do corpo EXATO como recebido (sem
 * reformatar/reserializar), por isso o endpoint do webhook lê o corpo bruto
 * em vez de deixar o Vercel already parseá-lo em JSON — ver payments/webhook.ts.
 *
 * Doc oficial: https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao
 */
export function verifyPagbankSignature(rawBody: string, token: string, receivedSignature: string | undefined): boolean {
  if (!receivedSignature) return false;

  const expected = crypto.createHash('sha256').update(`${token}-${rawBody}`).digest('hex');

  // Comparação em tempo constante para evitar timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedSignature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
