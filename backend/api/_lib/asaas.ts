/**
 * Cliente HTTP para a API do Asaas. O Access Token PRIVADO é lido de
 * variável de ambiente do backend e nunca é enviado ao frontend.
 */
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? '';
const ASAAS_ENV = process.env.ASAAS_ENV ?? 'production'; // 'production' | 'sandbox'

export const ASAAS_BASE_URL =
  ASAAS_ENV === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';

interface AsaasRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** Chama a API do Asaas já com autenticação e tratamento de erro padrão. */
export async function asaasRequest<T = any>(path: string, options: AsaasRequestOptions = {}): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.errors?.[0]?.description ?? `Erro HTTP ${res.status}`;
    throw new Error(`[Asaas] ${message}`);
  }

  return data as T;
}
