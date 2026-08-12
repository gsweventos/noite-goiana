import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody, del } from '@vercel/blob/client';
import { z } from 'zod';
import { applyCors } from './_lib/cors';
import { verificarAdmin, verificarAdminPorToken } from './_lib/verificarAdmin';

const deleteSchema = z.object({ url: z.string().url() });

/**
 * POST /api/photos-upload — gera um token de envio pro Vercel Blob (o arquivo
 * vai direto do navegador pro Blob, sem passar pela nossa função — evita o
 * limite de tamanho de corpo de requisição do plano gratuito).
 *
 * DELETE /api/photos-upload — apaga uma foto do Vercel Blob.
 *
 * Os dois juntos num arquivo só (limite de 12 funções no plano gratuito).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method === 'DELETE') {
    const adminUid = await verificarAdmin(req);
    if (!adminUid) return res.status(403).json({ error: 'Apenas administradores podem apagar fotos.' });

    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

    try {
      await del(parsed.data.url);
      return res.json({ ok: true });
    } catch (err) {
      console.error('[photos-upload delete] erro:', err);
      return res.status(500).json({ error: 'Não foi possível apagar a foto.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const jsonResponse = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req as unknown as Request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // O front manda o token de login do Firebase pelo clientPayload
        // (não dá pra mandar um header customizado nesse fluxo do Vercel
        // Blob) — confere aqui se é admin de verdade antes de liberar o envio.
        const adminUid = await verificarAdminPorToken(clientPayload ?? undefined);
        if (!adminUid) throw new Error('Apenas administradores podem enviar fotos.');

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
          addRandomSuffix: true,
          maximumSizeInBytes: 15 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // Não precisamos fazer nada aqui — o frontend salva os metadados no
        // Firestore assim que a promessa de upload() resolve, no navegador.
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('[photos-upload] erro:', err);
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Não foi possível gerar o envio.' });
  }
}
