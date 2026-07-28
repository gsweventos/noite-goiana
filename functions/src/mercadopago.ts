import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/**
 * Cliente do Mercado Pago inicializado com o Access Token PRIVADO,
 * lido de variável de ambiente/secret do backend. Este arquivo nunca
 * é enviado ao frontend.
 */
const accessToken = process.env.MP_ACCESS_TOKEN ?? '';

export const mpClient = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 8000 },
});

export const mpPreference = new Preference(mpClient);
export const mpPayment = new Payment(mpClient);
