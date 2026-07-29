import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  process.env.PUBLIC_APP_URL ?? 'https://www.noitegoiana.com.br',
  'https://www.noitegoiana.com.br',
  'https://noitegoiana.com.br',
  'http://www.noitegoiana.com.br',
  'http://noitegoiana.com.br',
  'https://gsweventos.github.io',
  'http://localhost:5173',
];

/**
 * Aplica os cabeçalhos de CORS e responde automaticamente a requisições
 * "preflight" (OPTIONS) do navegador. Retorna `true` se a função deve parar
 * por aqui (era um preflight), ou `false` se deve continuar processando.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
