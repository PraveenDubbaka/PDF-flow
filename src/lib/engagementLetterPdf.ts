import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Capture the existing letter sheet, not the app or its toolbar. Pagination
// prefers blank scanlines so paragraphs/signatures are not cut through ink.
export async function generateEngagementLetterPdf(sheet: HTMLElement): Promise<Uint8Array> {
  await Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 3000))]);
  await Promise.race([Promise.all(Array.from(sheet.querySelectorAll('img')).map((img) => {
    // The capture sheet is offscreen; lazy images otherwise never start loading.
    img.loading = 'eager';
    return img.decode().catch(() => {});
  })), new Promise((resolve) => window.setTimeout(resolve, 3000))]);
  const canvas = await html2canvas(sheet, {
    scale: 2,
    backgroundColor: '#ffffff',
    imageTimeout: 3000,
    onclone: (doc) => {
      doc.documentElement.classList.remove('dark');
      doc.querySelectorAll<HTMLImageElement>('[data-letter-pdf-source] img').forEach((img) => { img.loading = 'eager'; });
      doc.querySelectorAll('[data-letter-pdf-source] button').forEach((button) => button.remove());
    },
  });
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = 612;
  const pageHeight = 792;
  const maximum = Math.floor(canvas.width * pageHeight / pageWidth);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the engagement letter PDF.');
  let top = 0;
  while (top < canvas.height) {
    let bottom = Math.min(top + maximum, canvas.height);
    if (bottom < canvas.height) {
      for (let y = bottom; y > bottom - 100; y--) {
        const pixels = context.getImageData(0, y - 1, canvas.width, 1).data;
        if (pixels.every((value, index) => index % 4 === 3 || value > 245)) { bottom = y; break; }
      }
    }
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = bottom - top;
    const target = slice.getContext('2d');
    if (!target) throw new Error('Unable to prepare a letter page.');
    target.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, slice.width, slice.height);
    if (top) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, slice.height * pageWidth / canvas.width);
    top = bottom;
  }
  return new Uint8Array(pdf.output('arraybuffer'));
}