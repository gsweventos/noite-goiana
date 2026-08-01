import PDFDocument from 'pdfkit';
import { generateQrPngBuffer } from './qr';

interface TicketPdfParams {
  eventoNome: string;
  local: string;
  dataFormatada: string;
  compradorNome: string;
  codigo: string;
  qrPayload: string;
}

const ROXO = '#7C3AED';
const ROXO_ESCURO = '#4C1D95';
const CINZA_ESCURO = '#18181B';
const CINZA = '#6B7280';
const CINZA_CLARO = '#9CA3AF';
const BORDA = '#E5E7EB';

/**
 * Gera o PDF do ingresso — visual de "canhoto de ingresso", com o cartão
 * inteiro desenhado por coordenadas explícitas (evita o bug clássico de
 * texto sobrepondo imagem: nunca confiar em moveDown() depois de posicionar
 * uma imagem manualmente, sempre calcular a próxima posição a partir da
 * altura real do que acabou de ser desenhado).
 */
export async function buildTicketPdf(params: TicketPdfParams): Promise<Buffer> {
  const qrPng = await generateQrPngBuffer(params.qrPayload);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 32;
    const cardX = margin;
    const cardW = pageW - margin * 2;
    const cardY = margin;
    const contentX = cardX + 28;
    const contentW = cardW - 56;

    // --- Fundo geral levemente cinza, com o "cartão" branco por cima ---
    doc.rect(0, 0, pageW, pageH).fill('#F4F4F5');
    doc.roundedRect(cardX, cardY, cardW, pageH - margin * 2, 14).fill('#FFFFFF');

    // --- Faixa superior colorida com o nome do site ---
    const headerH = 64;
    doc.save();
    doc.roundedRect(cardX, cardY, cardW, headerH, 14).clip();
    doc.rect(cardX, cardY, cardW, headerH).fill(ROXO);
    doc.restore();
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Noite Goiana', cardX, cardY + 22, { width: cardW, align: 'center' });

    let y = cardY + headerH + 26;

    // --- Nome do evento + selo "INGRESSO" ---
    doc
      .fillColor(CINZA_ESCURO)
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(params.eventoNome, contentX, y, { width: contentW, align: 'center' });
    y = doc.y + 4;

    doc
      .fillColor(ROXO)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('INGRESSO DIGITAL', contentX, y, { width: contentW, align: 'center', characterSpacing: 1.5 });
    y = doc.y + 14;

    // --- Local e data ---
    doc
      .fillColor(CINZA)
      .font('Helvetica')
      .fontSize(11)
      .text(params.local, contentX, y, { width: contentW, align: 'center' });
    y = doc.y + 2;
    doc
      .fillColor(CINZA)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(params.dataFormatada, contentX, y, { width: contentW, align: 'center' });
    y = doc.y + 22;

    // --- Linha pontilhada "picotada", com meios-círculos nas laterais (efeito canhoto) ---
    const notchR = 10;
    doc.save();
    doc.circle(cardX, y, notchR).fill('#F4F4F5');
    doc.circle(cardX + cardW, y, notchR).fill('#F4F4F5');
    doc.restore();
    doc
      .strokeColor(BORDA)
      .lineWidth(1)
      .dash(4, { space: 4 })
      .moveTo(cardX + notchR + 4, y)
      .lineTo(cardX + cardW - notchR - 4, y)
      .stroke();
    doc.undash();
    y += 26;

    // --- QR Code, centralizado ---
    const qrSize = 168;
    const qrX = cardX + (cardW - qrSize) / 2;
    doc.roundedRect(qrX - 10, y - 10, qrSize + 20, qrSize + 20, 10).fillAndStroke('#FAFAFA', BORDA);
    doc.image(qrPng, qrX, y, { width: qrSize, height: qrSize });
    y += qrSize + 24;

    // --- Comprador e código ---
    doc
      .fillColor(CINZA_ESCURO)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(params.compradorNome, contentX, y, { width: contentW, align: 'center' });
    y = doc.y + 3;
    doc
      .fillColor(CINZA_CLARO)
      .font('Helvetica')
      .fontSize(10)
      .text(`Código ${params.codigo}`, contentX, y, { width: contentW, align: 'center', characterSpacing: 0.5 });
    y = doc.y + 18;

    // --- Rodapé ---
    doc
      .fillColor(CINZA_CLARO)
      .font('Helvetica')
      .fontSize(8)
      .text('Ingresso pessoal e intransferível. Apresente este QR Code na entrada do evento.', contentX, y, {
        width: contentW,
        align: 'center',
        lineGap: 2,
      });

    doc.end();
  });
}
