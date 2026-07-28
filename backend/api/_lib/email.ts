import nodemailer from 'nodemailer';

/**
 * Envio de e-mail transacional com o ingresso em PDF anexado.
 * Configurável para qualquer provedor SMTP (SendGrid, Amazon SES,
 * Mailgun, Zoho, etc.) — basta preencher as variáveis SMTP_* no .env
 * das Cloud Functions.
 */
function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

interface SendTicketEmailParams {
  to: string;
  nomeComprador: string;
  eventoNome: string;
  pdfBuffer: Buffer;
}

export async function sendTicketEmail({ to, nomeComprador, eventoNome, pdfBuffer }: SendTicketEmailParams) {
  if (!process.env.SMTP_HOST) {
    // Sem SMTP configurado ainda (ex.: ambiente de desenvolvimento) — não falha o fluxo,
    // apenas registra no log para não travar a emissão do ingresso.
    console.warn('[email] SMTP não configurado — pulando envio para', to);
    return;
  }

  const transport = buildTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'Noite Goiana <contato@noitegoiana.com.br>',
    to,
    subject: `Seu ingresso — ${eventoNome}`,
    text: `Olá, ${nomeComprador}! Seu ingresso para ${eventoNome} está em anexo. Apresente o QR Code na entrada.`,
    html: `<p>Olá, <strong>${nomeComprador}</strong>!</p><p>Seu ingresso para <strong>${eventoNome}</strong> está em anexo, em PDF.</p><p>Apresente o QR Code do PDF na entrada do evento. Ele é pessoal e intransferível.</p>`,
    attachments: [{ filename: 'ingresso-noite-goiana.pdf', content: pdfBuffer }],
  });
}
