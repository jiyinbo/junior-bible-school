import { jsPDF } from 'jspdf';
import shieldUrl from '../../assets/certs/wofbi-shield.png';
import winnersUrl from '../../assets/certs/winners-logo.png';

/** Shared payload the API returns for both the statement of result and the certificate. */
export type DocumentData = {
  registration_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  session_name: string;
  level_name: string;
  issued_on: string;
  overall_grade_label: string | null;
  overall_grade_short: string | null;
  overall_percent: number | null;
  modules: { serial: number; name: string; grade: string; taken: boolean }[];
};

const RED: [number, number, number] = [192, 40, 40];
const DARK: [number, number, number] = [38, 43, 56];
const TEXT: [number, number, number] = [20, 20, 20];
const MUTED: [number, number, number] = [90, 90, 90];
const GRAY_BG: [number, number, number] = [217, 217, 217];
const GRAY_HEAD: [number, number, number] = [201, 201, 201];
const LINE: [number, number, number] = [110, 110, 110];

type LoadedImage = { dataUrl: string; w: number; h: number };
type Images = { shield: LoadedImage; winners: LoadedImage };

const imageCache = new Map<string, Promise<LoadedImage>>();

function loadImage(url: string): Promise<LoadedImage> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const promise = new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

async function loadImages(): Promise<Images> {
  const [shield, winners] = await Promise.all([loadImage(shieldUrl), loadImage(winnersUrl)]);
  return { shield, winners };
}

/** Strips a trailing " - 2026" style year suffix so headings read cleanly. */
function sessionSubtitle(sessionName: string): string {
  return sessionName.replace(/\s*-\s*\d{4}\s*$/, '').trim() || sessionName;
}

function drawCenteredImage(
  doc: jsPDF,
  image: LoadedImage,
  cx: number,
  top: number,
  targetW: number,
): number {
  const h = (image.h / image.w) * targetW;
  doc.addImage(image.dataUrl, 'PNG', cx - targetW / 2, top, targetW, h);
  return top + h;
}

function labeledLine(
  doc: jsPDF,
  x: number,
  y: number,
  rightX: number,
  label: string,
  value?: string,
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT);
  doc.text(label, x, y);
  const lineStart = x + doc.getTextWidth(label) + 2.5;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.line(lineStart, y + 0.6, rightX, y + 0.6);
  if (value) {
    doc.setFont('helvetica', 'bold');
    doc.text(value, lineStart + 2, y - 0.4);
  }
}

// ---------------------------------------------------------------------------
// Statement of result (A4 portrait)
// ---------------------------------------------------------------------------

function drawStatement(doc: jsPDF, data: DocumentData, images: Images): void {
  const pageW = 210;
  const margin = 18;
  const cx = pageW / 2;
  const rightX = pageW - margin;

  let y = 14;
  y = drawCenteredImage(doc, images.shield, cx, y, 24) + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...RED);
  doc.text('WORD OF FAITH BIBLE INSTITUTE', cx, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('…liberating the world through the preaching of the Word of Faith', cx, y, {
    align: 'center',
  });
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text(`JUNIOR WOFBI COURSE - JWC (${data.level_name})`, cx, y, { align: 'center' });
  y += 6;

  doc.setFontSize(14);
  doc.setTextColor(...RED);
  doc.text('STATEMENT OF RESULT', cx, y, { align: 'center' });
  y += 12;

  labeledLine(doc, margin, y, rightX, 'Student Name:', data.full_name);
  y += 8;
  labeledLine(doc, margin, y, rightX, 'Student Number:', data.registration_number);
  y += 8;
  labeledLine(doc, margin, y, rightX, 'Date:', data.issued_on);
  y += 8;

  // Results table with a light-grey block behind it.
  const tableX = margin;
  const tableW = rightX - margin;
  const serialW = 30;
  const gradeW = 30;
  const subjectX = tableX + serialW;
  const gradeX = tableX + tableW - gradeW;
  const rowH = 7.2;
  const headH = 8;
  const tableTop = y;
  const tableHeight = headH + data.modules.length * rowH;

  doc.setFillColor(...GRAY_BG);
  doc.rect(tableX, tableTop, tableW, tableHeight, 'F');
  doc.setFillColor(...GRAY_HEAD);
  doc.rect(tableX, tableTop, tableW, headH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  const headMid = tableTop + headH / 2 + 1.3;
  doc.text('Serial Number', tableX + serialW / 2, headMid, { align: 'center' });
  doc.text('Subject Title', subjectX + 3, headMid);
  doc.text('Grade', gradeX + gradeW / 2, headMid, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let rowY = tableTop + headH;
  for (const m of data.modules) {
    const mid = rowY + rowH / 2 + 1.2;
    doc.setTextColor(...MUTED);
    doc.text(`${m.serial}.`, tableX + serialW / 2, mid, { align: 'center' });
    doc.setTextColor(...TEXT);
    doc.text(m.name, subjectX + 3, mid, { maxWidth: gradeX - subjectX - 6 });
    doc.setFont('helvetica', 'bold');
    doc.text(m.grade, gradeX + gradeW / 2, mid, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    rowY += rowH;
  }

  y = tableTop + tableHeight + 12;

  const overall = data.overall_grade_label ? data.overall_grade_label.toUpperCase() : '—';
  labeledLine(doc, margin, y, rightX, 'Overall Grade:', overall);
  y += 12;
  labeledLine(doc, margin, y, rightX, 'Controller of Examinations:');

  // Footer: Winners' Chapel logo + campus line.
  const footerY = 285;
  const logoW = 9;
  const logoH = (images.winners.h / images.winners.w) * logoW;
  doc.addImage(images.winners.dataUrl, 'PNG', margin, footerY - logoH + 1, logoW, logoH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text("Winners' Chapel International, Dartford", margin + logoW + 3, footerY - logoH / 2 + 1.5);
}

// ---------------------------------------------------------------------------
// Certificate of achievement (A4 landscape)
// ---------------------------------------------------------------------------

function drawCertificate(doc: jsPDF, data: DocumentData, images: Images): void {
  const pageW = 297;
  const cx = pageW / 2;

  let y = 26;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(30);
  doc.setTextColor(...RED);
  doc.text('The Word of Faith Bible Institute, Dartford', cx, y, { align: 'center' });
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...TEXT);
  doc.text('Certificate of Achievement', cx, y, { align: 'center' });
  y += 14;

  doc.setFont('times', 'italic');
  doc.setFontSize(17);
  doc.setTextColor(...RED);
  doc.text('This is to certify that', cx, y, { align: 'center' });
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...DARK);
  doc.text(data.full_name.toUpperCase(), cx, y, { align: 'center', maxWidth: pageW - 50 });
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text('has fulfilled the requirements of the Institute for the', cx, y, { align: 'center' });
  y += 15;

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(30);
  doc.setTextColor(...DARK);
  doc.text(`${data.level_name} Junior Bible School`, cx, y, {
    align: 'center',
    maxWidth: pageW - 50,
  });

  // Shield crest, centred low on the page.
  drawCenteredImage(doc, images.shield, cx, 150, 22);

  // Signature lines.
  const sigY = 188;
  const leftX = 40;
  const rightX = pageW - 40;
  const lineLen = 55;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(leftX, sigY, leftX + lineLen, sigY);
  doc.line(rightX - lineLen, sigY, rightX, sigY);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text('WOFBI Coordinator', leftX, sigY + 6);
  doc.text('Date', rightX, sigY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(data.issued_on, rightX, sigY - 2, { align: 'right' });

  // Faint session reference in the footer.
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(sessionSubtitle(data.session_name), cx, 202, { align: 'center' });
}

// ---------------------------------------------------------------------------
// Public generators
// ---------------------------------------------------------------------------

export async function generateStatementPdf(data: DocumentData, filename: string): Promise<void> {
  const images = await loadImages();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  drawStatement(doc, data, images);
  doc.save(filename);
}

export async function generateCertificatePdf(data: DocumentData, filename: string): Promise<void> {
  const images = await loadImages();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  drawCertificate(doc, data, images);
  doc.save(filename);
}

export async function generateStatementsPdf(list: DocumentData[], filename: string): Promise<void> {
  const images = await loadImages();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  list.forEach((data, i) => {
    if (i > 0) doc.addPage('a4', 'portrait');
    drawStatement(doc, data, images);
  });
  doc.save(filename);
}

export async function generateCertificatesPdf(list: DocumentData[], filename: string): Promise<void> {
  const images = await loadImages();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  list.forEach((data, i) => {
    if (i > 0) doc.addPage('a4', 'landscape');
    drawCertificate(doc, data, images);
  });
  doc.save(filename);
}
