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

/** Gera um PDF simples e legível do ingresso, com o QR Code centralizado. */
export async function buildTicketPdf(params: TicketPdfParams): Promise<Buffer> {
  const qrPng = await generateQrPngBuffer(params.qrPayload);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#6D28D9').fontSize(20).text('Noite Goiana', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#111111').fontSize(16).text(params.eventoNome, { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#555555').fontSize(11).text(params.local, { align: 'center' });
    doc.text(params.dataFormatada, { align: 'center' });

    doc.moveDown(1.5);
    const qrSize = 200;
    const x = (doc.page.width - qrSize) / 2;
    doc.image(qrPng, x, doc.y, { width: qrSize, height: qrSize });
    doc.moveDown(qrSize / 14);

    doc.fontSize(11).fillColor('#111111').text(`Comprador: ${params.compradorNome}`, { align: 'center' });
    doc.fontSize(10).fillColor('#888888').text(`Código: ${params.codigo}`, { align: 'center' });

    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text('Ingresso pessoal e intransferível. Apresente este QR Code na entrada do evento.', { align: 'center' });

    doc.end();
  });
}
