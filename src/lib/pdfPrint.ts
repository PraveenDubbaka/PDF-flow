import * as pdfjs from 'pdfjs-dist';

export interface PdfPrinter {
  print: (bytes: Uint8Array) => Promise<void>;
  fallback: (bytes: Uint8Array) => Promise<void>;
  dispose: () => void;
}

// Keep generation and fallback orchestration independently testable.
export async function printGeneratedPdf(generate: () => Promise<Uint8Array>, printer: PdfPrinter) {
  try {
    const bytes = await generate();
    if (!bytes.length) throw new Error('Unable to generate the PDF for printing.');
    try { await printer.print(bytes); }
    catch { await printer.fallback(bytes); }
  } catch (error) {
    printer.dispose();
    throw error;
  }
}

export function isMacPlatform() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function createPdfPrinter(onManualPrint: () => void): PdfPrinter {
  // Reserve the fallback during the click, before PDF generation loses user activation.
  let fallbackWindow = window.open('about:blank', '_blank');
  if (fallbackWindow) fallbackWindow.opener = null;
  let frame: HTMLIFrameElement | null = null;
  let blobUrl: string | null = null;
  const dispose = () => {
    frame?.remove();
    frame = null;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null;
    fallbackWindow?.close();
    fallbackWindow = null;
  };
  return {
    dispose,
    async print(bytes) {
      // Native PDF viewers in frames do not reliably expose print(). Render the
      // exported (edited) PDF as ordinary printable HTML instead, at 144 dpi.
      const task = pdfjs.getDocument({ data: bytes.slice() });
      const pdf = await task.promise;
      const pages: string[] = [];
      try {
        for (let index = 1; index <= pdf.numPages; index++) {
          const page = await pdf.getPage(index);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Unable to prepare the PDF for printing.');
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          const width = viewport.width / 2;
          const height = viewport.height / 2;
          pages.push(`<style>@page pdfpage${index}{size:${width}pt ${height}pt;margin:0}</style><section style="page:pdfpage${index};width:${width}pt;height:${height}pt"><img src="${canvas.toDataURL('image/png')}" alt="Page ${index}" /></section>`);
          canvas.width = canvas.height = 0;
        }
      } finally { await task.destroy(); }
      frame = document.createElement('iframe');
      frame.title = 'Print PDF document';
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0';
      const ready = new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Print preparation timed out.')), 30000);
        if (!frame) { clearTimeout(timeout); reject(new Error('Print frame unavailable.')); return; }
        frame.onload = async () => {
          try {
            const images = Array.from(frame?.contentDocument?.images ?? []);
            if (!images.length) throw new Error('Print pages unavailable.');
            await Promise.all(images.map((image) => image.decode()));
            clearTimeout(timeout);
            resolve();
          } catch (error) { clearTimeout(timeout); reject(error); }
        };
      });
      frame.srcdoc = `<!doctype html><html><head><title>PDF document</title><style>html,body{margin:0;padding:0;background:white}section{break-after:page;overflow:hidden}section:last-child{break-after:auto}img{display:block;width:100%;height:100%}@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>${pages.join('')}</body></html>`;
      document.body.appendChild(frame);
      await ready;
      const target = frame.contentWindow;
      if (!target || typeof target.print !== 'function') throw new Error('Printing is unavailable.');
      target.addEventListener('afterprint', dispose, { once: true });
      target.focus();
      target.print();
      fallbackWindow?.close();
      fallbackWindow = null;
      // Do not revoke/remove while a print dialog may still be consuming pages.
      window.setTimeout(dispose, 600000);
    },
    async fallback(bytes) {
      frame?.remove();
      frame = null;
      blobUrl = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: 'application/pdf' }));
      const target = fallbackWindow && !fallbackWindow.closed ? fallbackWindow : window.open('about:blank', '_blank');
      if (!target) {
        dispose();
        throw new Error('Allow pop-ups for this site, then click Print again.');
      }
      target.opener = null;
      target.addEventListener('load', () => {
        try { target.focus(); target.print(); } catch { /* Native viewer: use its print command. */ }
      }, { once: true });
      target.location.href = blobUrl;
      // Viewer print can fail silently, so always provide the manual shortcut.
      onManualPrint();
      fallbackWindow = null; // Leave the PDF tab open for manual printing.
      window.setTimeout(() => { if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; }, 600000);
    },
  };
}