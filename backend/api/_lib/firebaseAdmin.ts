import * as admin from 'firebase-admin';

/**
 * Fora do Firebase (aqui rodando no Vercel), o Admin SDK precisa de uma
 * "conta de serviço" (service account) explícita — não existe autenticação
 * automática como dentro de Cloud Functions.
 *
 * As três variáveis abaixo vêm do JSON gerado em:
 *   Firebase Console → Configurações do projeto → Contas de serviço →
 *   "Gerar nova chave privada"
 *
 * Configure-as como Environment Variables no painel do Vercel (nunca commitar
 * o JSON da conta de serviço no repositório).
 */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // No painel do Vercel, quebras de linha em variáveis de ambiente viram
      // "\n" literal — por isso a conversão abaixo.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    }),
  });
}

export const db = admin.firestore();
export { admin };
