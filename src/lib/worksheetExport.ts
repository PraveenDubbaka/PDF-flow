// Worksheet export — PDF (print) and Word (.doc HTML blob)

export function exportWorksheetAsPDF(title: string) {
  const source = document.getElementById('worksheet-export-content');
  if (!source) { window.print(); return; }

  // Clone content to a body-level element so @media print can isolate it
  const el = document.createElement('div');
  el.id = 'worksheet-print-area';
  el.innerHTML = `
    <div style="font-family:Calibri,Arial,sans-serif;padding:32px 40px;color:#1a1a1a">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px">${title}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:24px;border-bottom:1px solid #e5e7eb;padding-bottom:12px">
        Exported ${new Date().toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' })}
      </div>
      ${source.innerHTML}
    </div>`;
  document.body.appendChild(el);

  const afterPrint = () => {
    document.body.removeChild(el);
    window.removeEventListener('afterprint', afterPrint);
  };
  window.addEventListener('afterprint', afterPrint);

  window.print();

  // Fallback removal in case afterprint doesn't fire (some browsers)
  setTimeout(() => {
    if (document.body.contains(el)) document.body.removeChild(el);
  }, 3000);
}

export function exportWorksheetAsWord(title: string) {
  const source = document.getElementById('worksheet-export-content');
  if (!source) return;

  const date = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Normal</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 1in; }
    h1 { font-size: 16pt; font-weight: bold; margin: 0 0 4pt; }
    .export-date { font-size: 9pt; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8pt; margin-bottom: 18pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 10pt; }
    th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 5pt 7pt; font-weight: 600; text-align: left; font-size: 9pt; text-transform: uppercase; }
    td { border: 1px solid #d1d5db; padding: 5pt 7pt; vertical-align: top; }
    tr { page-break-inside: avoid; }
    textarea, input[type="text"], input[type="number"] { width: 100%; font-family: inherit; font-size: 10pt; border: none; background: none; }
    select { font-family: inherit; font-size: 10pt; }
    button, [role="button"], .no-print { display: none !important; }
    .section-title { font-size: 12pt; font-weight: 700; margin: 14pt 0 6pt; border-bottom: 1.5pt solid #1a1a1a; padding-bottom: 3pt; }
    .badge { display: inline-block; padding: 1pt 5pt; border: 1pt solid #d1d5db; border-radius: 4pt; font-size: 9pt; }
    .text-red-700 { color: #b91c1c; }
    .text-amber-700 { color: #b45309; }
    .text-green-700 { color: #15803d; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="export-date">Exported ${date}</div>
  ${source.innerHTML}
</body>
</html>`;

  const blob = new Blob(['﻿', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9\s—–-]/g, '').trim().replace(/[\s—–-]+/g, '-')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
