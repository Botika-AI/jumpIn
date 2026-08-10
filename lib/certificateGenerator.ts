import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument, rgb, StandardFonts, PDFTextField, PDFName, PDFRef, PDFArray, PDFDict } from 'pdf-lib';

interface CertificatoTemplate {
  titolo: string;
  descrizione: string;
  immagine_url: string | null;
  campi_dinamici: string[];
}

interface StudenteData {
  nome: string;
  cognome: string;
  scuola: string | null;
  nome_evento: string;
  data_emissione: string;
}

function fillTemplate(text: string, studente: StudenteData): string {
  return text
    .replace(/\{\{nome_studente\}\}/g, studente.nome)
    .replace(/\{\{cognome_studente\}\}/g, studente.cognome)
    .replace(/\{\{nome_scuola\}\}/g, studente.scuola ?? '')
    .replace(/\{\{nome_evento\}\}/g, studente.nome_evento)
    .replace(/\{\{data_emissione\}\}/g, studente.data_emissione);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// PDF template: rimuove i widget direttamente dalla struttura PDF (senza flatten),
// poi disegna il testo in nero nelle posizioni dove stavano i campi.
async function generateFromTemplatePDF(
  template: CertificatoTemplate,
  studente: StudenteData,
): Promise<void> {
  const pdfBytes = await fetch(template.immagine_url!).then(r => r.arrayBuffer());
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  const pages    = pdfDoc.getPages();
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, ' ').trim();

  const values: Record<string, string> = {
    'nome studente':     studente.nome,
    'nome_studente':     studente.nome,
    'nome':              studente.nome,
    'cognome studente':  studente.cognome,
    'cognome_studente':  studente.cognome,
    'cognome':           studente.cognome,
    'nome scuola':       studente.scuola ?? '',
    'nome_scuola':       studente.scuola ?? '',
    'scuola':            studente.scuola ?? '',
    'data emissione':    studente.data_emissione,
    'data di emissione': studente.data_emissione,
    'data_emissione':    studente.data_emissione,
    'data':              studente.data_emissione,
    'nome evento':       studente.nome_evento,
    'nome_evento':       studente.nome_evento,
    'evento':            studente.nome_evento,
    'titolo evento':     template.titolo,
    'titolo_evento':     template.titolo,
    'titolo':            template.titolo,
  };

  type FieldDraw = {
    pageIndex: number;
    rect: { x: number; y: number; width: number; height: number };
    text: string;
  };
  const toDraw: FieldDraw[] = [];

  // Fase 1 — raccoglie posizioni + valori tramite la form API
  const form = pdfDoc.getForm();
  for (const field of form.getFields()) {
    if (!(field instanceof PDFTextField)) continue;
    const val = values[norm(field.getName())];
    if (val === undefined) continue;

    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle();
      let pageIndex = 0;
      try {
        const pEntry = widget.dict.get(PDFName.of('P'));
        if (pEntry instanceof PDFRef) {
          const idx = pages.findIndex(p => p.ref.objectNumber === pEntry.objectNumber);
          if (idx >= 0) pageIndex = idx;
        }
      } catch { /* fallback pagina 0 */ }
      toDraw.push({ pageIndex, rect, text: val });
    }
  }

  // Fase 2 — rimuove TUTTI i widget dalle annotazioni di ogni pagina
  // (senza usare form.flatten() che ri-genera gli stream blu prima di appiattire)
  for (const page of pages) {
    const annotsEntry = page.node.get(PDFName.of('Annots'));
    if (!annotsEntry) continue;

    // Risolve eventuali riferimenti indiretti
    let annotsArr: PDFArray | undefined;
    if (annotsEntry instanceof PDFArray) {
      annotsArr = annotsEntry;
    } else if (annotsEntry instanceof PDFRef) {
      const resolved = pdfDoc.context.lookup(annotsEntry);
      if (resolved instanceof PDFArray) annotsArr = resolved;
    }

    if (!annotsArr) continue;

    // Tieni solo le annotazioni che NON sono Widget (es. link, commenti)
    const toKeep: PDFRef[] = [];
    for (let i = 0; i < annotsArr.size(); i++) {
      const item = annotsArr.get(i);
      let dict: PDFDict | undefined;
      if (item instanceof PDFRef) {
        const r = pdfDoc.context.lookup(item);
        if (r instanceof PDFDict) dict = r;
      } else if (item instanceof PDFDict) {
        dict = item;
      }
      if (!dict) continue;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (subtype?.toString() !== '/Widget') toKeep.push(item as PDFRef);
    }

    if (toKeep.length === 0) {
      page.node.delete(PDFName.of('Annots'));
    } else {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(toKeep));
    }
  }

  // Fase 3 — rimuove l'AcroForm dal catalogo del documento
  pdfDoc.catalog.delete(PDFName.of('AcroForm'));

  // Fase 4 — disegna il testo in nero dove stavano i campi
  for (const { pageIndex, rect, text } of toDraw) {
    const page = pages[Math.min(pageIndex, pages.length - 1)];

    let fontSize = Math.min(16, Math.max(7, rect.height * 0.55));
    while (fontSize > 7 && font.widthOfTextAtSize(text, fontSize) > rect.width - 6) {
      fontSize -= 0.5;
    }

    const textW = font.widthOfTextAtSize(text, fontSize);
    const x = rect.x + (rect.width - textW) / 2;
    const y = rect.y + (rect.height - fontSize) / 2;

    page.drawText(text, {
      x: Math.max(rect.x + 2, x),
      y: Math.max(rect.y + 1, y),
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const outBytes = await pdfDoc.save();
  downloadBlob(
    new Blob([outBytes], { type: 'application/pdf' }),
    `certificato_${studente.nome.toLowerCase()}_${studente.cognome.toLowerCase()}.pdf`,
  );
}

// Image template: draw image on canvas, overlay text, export PDF
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, curY);
      line = word + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, curY);
  return curY;
}

async function generateFromTemplateImage(
  template: CertificatoTemplate,
  studente: StudenteData,
): Promise<void> {
  const W = 794, H = 562;
  const SCALE = 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = template.immagine_url!;
  });
  ctx.drawImage(img, 0, 0, W, H);

  const nome = `${studente.nome} ${studente.cognome}`;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = '#E8792F';
  ctx.shadowColor = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur = 8;
  ctx.fillText(nome, W / 2, Math.round(H * 0.52));
  ctx.restore();

  if (template.descrizione) {
    const filled = fillTemplate(template.descrizione, studente);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = '#333333';
    ctx.shadowColor = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 4;
    wrapText(ctx, filled, W / 2, Math.round(H * 0.57), W - 180, 20);
    ctx.restore();
  }

  const footerParts = [studente.scuola, studente.data_emissione].filter(Boolean);
  if (footerParts.length > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillStyle = '#555555';
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(footerParts.join('  ·  '), W / 2, H - 32);
    ctx.restore();
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  pdf.save(`certificato_${studente.nome.toLowerCase()}_${studente.cognome.toLowerCase()}.pdf`);
}

// HTML fallback: branded JumpIn design when no template is provided
function buildCertificateHTML(template: CertificatoTemplate, studente: StudenteData): string {
  const descrizioneFilta = fillTemplate(template.descrizione, studente);
  return `
    <div style="
      width: 794px; height: 562px; position: relative;
      font-family: Georgia, 'Times New Roman', serif;
      background: #ffffff; box-sizing: border-box; overflow: hidden;
    ">
      <div style="position:absolute;inset:18px;border:1.5px solid #E8792F;border-radius:4px;pointer-events:none;"></div>
      <div style="position:absolute;inset:24px;border:0.5px solid rgba(232,121,47,0.3);border-radius:2px;pointer-events:none;"></div>
      <div style="position:absolute;top:14px;left:14px;width:16px;height:16px;border-top:2.5px solid #E8792F;border-left:2.5px solid #E8792F;"></div>
      <div style="position:absolute;top:14px;right:14px;width:16px;height:16px;border-top:2.5px solid #E8792F;border-right:2.5px solid #E8792F;"></div>
      <div style="position:absolute;bottom:14px;left:14px;width:16px;height:16px;border-bottom:2.5px solid #E8792F;border-left:2.5px solid #E8792F;"></div>
      <div style="position:absolute;bottom:14px;right:14px;width:16px;height:16px;border-bottom:2.5px solid #E8792F;border-right:2.5px solid #E8792F;"></div>
      <div style="position:relative;z-index:1;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 80px;box-sizing:border-box;text-align:center;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#E8792F;margin:0 0 16px;">JUMP'IN · RIMINI</p>
        <div style="width:48px;height:2px;background:#E8792F;margin:0 auto 20px;"></div>
        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px;">${template.titolo}</h1>
        <p style="font-family:Georgia,serif;font-size:34px;font-weight:700;color:#E8792F;margin:0 0 20px;letter-spacing:1px;">${studente.nome} ${studente.cognome}</p>
        <p style="font-family:Georgia,serif;font-size:13.5px;color:#444;line-height:1.75;margin:0 0 24px;max-width:540px;">${descrizioneFilta}</p>
        <div style="width:48px;height:2px;background:rgba(232,121,47,0.4);margin:0 auto 16px;"></div>
        <div style="display:flex;gap:32px;align-items:center;justify-content:center;">
          ${studente.scuola ? `<p style="font-family:Arial,sans-serif;font-size:11px;color:#888;letter-spacing:0.5px;margin:0;text-transform:uppercase;">${studente.scuola}</p><div style="width:1px;height:14px;background:#ddd;"></div>` : ''}
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#888;letter-spacing:0.5px;margin:0;">${studente.data_emissione}</p>
        </div>
      </div>
    </div>
  `;
}

export async function generateCertificatePDF(
  template: CertificatoTemplate,
  studente: StudenteData,
): Promise<void> {
  if (!template.immagine_url) {
    // No template: use branded HTML design
    await generateFromHTML(template, studente);
    return;
  }

  if (template.immagine_url.toLowerCase().endsWith('.pdf')) {
    await generateFromTemplatePDF(template, studente);
  } else {
    await generateFromTemplateImage(template, studente);
  }
}

async function generateFromHTML(
  template: CertificatoTemplate,
  studente: StudenteData,
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.innerHTML = buildCertificateHTML(template, studente);
  document.body.appendChild(container);
  const el = container.firstElementChild as HTMLElement;
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      width: 794,
      height: 562,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
    pdf.save(`certificato_${studente.nome.toLowerCase()}_${studente.cognome.toLowerCase()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
