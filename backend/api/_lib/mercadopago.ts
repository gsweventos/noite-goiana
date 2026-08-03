import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/**
 * Cliente do Mercado Pago inicializado com o Access Token PRIVADO,
 * lido de variável de ambiente/secret do backend. Este arquivo nunca
 * é enviado ao frontend.
 */
const accessToken = process.env.MP_ACCESS_TOKEN ?? '';

// Aviso defensivo: ajuda a pegar o erro clássico de "credenciais misturadas"
// (token de teste usado como se fosse de produção, ou vice-versa) direto nos
// logs do Vercel, em vez de descobrir só quando o pagamento falhar.
if (accessToken.startsWith('TEST-')) {
  console.warn('[mercadopago] ATENÇÃO: MP_ACCESS_TOKEN parece ser um token de TESTE (começa com "TEST-"). Para cobranças reais, use o Access Token de PRODUÇÃO (começa com "APP_USR-").');
} else if (accessToken && !accessToken.startsWith('APP_USR-')) {
  console.warn('[mercadopago] ATENÇÃO: MP_ACCESS_TOKEN não está no formato esperado (deveria começar com "APP_USR-" para produção). Confira se copiou o valor certo.');
}

export const mpAccessToken = accessToken;

export const mpClient = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 8000 },
});

export const mpPreference = new Preference(mpClient);
export const mpPayment = new Payment(mpClient);
