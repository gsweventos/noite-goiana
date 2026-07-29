import type { VercelRequest } from '@vercel/node';
import { admin, db } from './firebaseAdmin';

/**
 * Confere se a requisição vem de um administrador de verdade, logado.
 * O frontend manda o token de autenticação do Firebase no header
 * Authorization: Bearer <token> — aqui a gente valida esse token com o
 * Admin SDK (impossível de falsificar) e confere se o uid está na coleção
 * `admins` do Firestore.
 *
 * Retorna o uid do admin se tudo certo, ou null se não for autorizado.
 */
export async function verificarAdmin(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const adminSnap = await db.collection('admins').doc(decoded.uid).get();
    return adminSnap.exists ? decoded.uid : null;
  } catch {
    return null;
  }
}
