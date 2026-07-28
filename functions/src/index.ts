import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { paymentsRouter } from './payments';
import { checkinRouter } from './checkin';

admin.initializeApp();

const app = express();

// CORS restrito ao domínio do frontend (GitHub Pages / domínio próprio).
app.use(
  cors({
    origin: [process.env.PUBLIC_APP_URL ?? 'https://www.noitegoiana.com.br', 'http://localhost:5173'],
  })
);
app.use(express.json());

// Rate limiting básico contra abuso/força bruta nas rotas públicas.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/payments', paymentsRouter);
app.use('/checkin', checkinRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

/**
 * Exporta a API inteira como uma única Cloud Function HTTP ("api").
 * URL final: https://<region>-<project-id>.cloudfunctions.net/api
 * (ou, com Firebase Hosting rewrites, https://www.noitegoiana.com.br/api/...)
 */
export const api = functions.https.onRequest(app);
