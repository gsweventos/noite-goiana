/**
 * Cliente HTTP para a API do PagBank (PagSeguro). Diferente do Mercado Pago,
 * o PagBank não tem um SDK oficial em Node.js tão completo — usamos fetch
 * nativo diretamente, com o Access Token PRIVADO lido de variável de
 * ambiente do backend. Este arquivo nunca é enviado ao frontend.
 */
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN ?? '';
const PAGBANK_ENV = process.env.PAGBANK_ENV ?? 'production'; // 'production' | 'sandbox'

export const PAGBANK_BASE_URL =
  PAGBANK_ENV === 'sandbox' ? 'https://sandbox.api.pagseguro.com' : 'https://api.pagseguro.com';

interface PagBankRequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
}

/** Chama a API do PagBank já com autenticação e tratamento de erro padrão. */
export async function pagbankRequest<T = any>(path: string, options: PagBankRequestOptions = {}): Promise<T> {
  const res = await fetch(`${PAGBANK_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${PAGBANK_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error_messages?.[0]?.description ?? data?.message ?? `Erro HTTP ${res.status}`;
    throw new Error(`[PagBank] ${message}`);
  }

  return data as T;
}

/** Token usado também para validar a assinatura dos webhooks (ver webhookSignature.ts). */
export function getPagbankToken(): string {
  return PAGBANK_TOKEN;
}
