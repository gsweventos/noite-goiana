import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors';

/** GET /api/health — usado só para conferir se o backend está no ar. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  return res.json({ ok: true, service: 'noite-goiana-backend' });
}
