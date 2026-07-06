import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/** Matches the server-side ID card (JbsIdCardPdfService): portrait ID-1 badge. */
export const CARD_WIDTH_MM = 53.98;
export const CARD_HEIGHT_MM = 85.6;
const CAMPUS_LINE_1 = 'Winners Chapel International';
const CAMPUS_LINE_2 = 'Dartford Campus';

const NAVY: [number, number, number] = [26, 51, 82];

export type IdCardStudent = {
  registration_number: string;
  full_name: string;
  level_name: string;
  session_name: string;
};

function sessionSubtitle(sessionName: string): string {
  const stripped = sessionName.replace(/\s*-\s*\d{4}\s*$/, '').trim();
  const value = stripped || sessionName;
  return value.length > 44 ? `${value.slice(0, 44)}…` : value;
}

function sessionYear(sessionName: string): string {
  const match = sessionName.match(/\d{4}/);
  return match ? match[0] : String(new Date().getFullYear());
}

async function qrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, { margin: 0, width: 320, errorCorrectionLevel: 'M' });
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  student: IdCardStudent,
  qr: string,
): void {
  const w = CARD_WIDTH_MM;
  const h = CARD_HEIGHT_MM;
  const cx = x + w / 2;
  const headerH = 12.5;
  const footerH = 6;
  const radius = 2.5;

  // White base + navy border.
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');

  // Header band (square off the bottom corners of the rounded rect).
  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, w, headerH, radius, radius, 'F');
  doc.rect(x, y + headerH - radius, w, radius, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('JUNIOR BIBLE SCHOOL', cx, y + 4.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(sessionSubtitle(student.session_name), cx, y + 7.8, {
    align: 'center',
    maxWidth: w - 4,
  });

  // Footer band (square off the top corners).
  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y + h - footerH, w, footerH, radius, radius, 'F');
  doc.rect(x, y + h - footerH, w, radius, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(sessionYear(student.session_name), cx, y + h - 1.7, { align: 'center' });

  // Re-stroke the outer rounded border over the header/footer fills.
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, radius, radius, 'S');

  // QR code with a navy border box.
  const qrSize = 15;
  const qrX = cx - qrSize / 2;
  const qrY = y + headerH + 4;
  doc.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.rect(qrX, qrY, qrSize, qrSize, 'S');

  let cursor = qrY + qrSize + 4.5;

  // Registration number.
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(student.registration_number, cx, cursor, { align: 'center' });
  cursor += 4.5;

  // Name (uppercase, may wrap to two lines).
  doc.setFontSize(9.5);
  const nameLines = doc.splitTextToSize(student.full_name.toUpperCase(), w - 6) as string[];
  const trimmedNameLines = nameLines.slice(0, 2);
  doc.text(trimmedNameLines, cx, cursor, { align: 'center' });
  cursor += trimmedNameLines.length * 4 + 2.5;

  // Divider with a centred dot.
  drawDivider(doc, x, cursor, w, true);
  cursor += 4;

  // Tier.
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.setFontSize(5);
  doc.text('TIER', cx, cursor, { align: 'center' });
  cursor += 3;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(6.5);
  const tierLines = doc.splitTextToSize(student.level_name, w - 6) as string[];
  doc.text(tierLines.slice(0, 2), cx, cursor, { align: 'center' });
  cursor += tierLines.slice(0, 2).length * 3 + 2;

  // Plain divider.
  drawDivider(doc, x, cursor, w, false);
  cursor += 3.5;

  // Campus.
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.setFontSize(5);
  doc.text('CAMPUS', cx, cursor, { align: 'center' });
  cursor += 3;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(6);
  doc.text(CAMPUS_LINE_1, cx, cursor, { align: 'center' });
  cursor += 2.6;
  doc.text(CAMPUS_LINE_2, cx, cursor, { align: 'center' });
}

function drawDivider(doc: jsPDF, x: number, y: number, w: number, withDot: boolean): void {
  const pad = 5;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  if (!withDot) {
    doc.line(x + pad, y, x + w - pad, y);
    return;
  }
  const cx = x + w / 2;
  const gap = 1.6;
  doc.line(x + pad, y, cx - gap, y);
  doc.line(cx + gap, y, x + w - pad, y);
  doc.setFillColor(...NAVY);
  doc.circle(cx, y, 0.85, 'F');
}

/**
 * Builds an A4 (portrait) PDF with a 3×3 grid of ID cards per page and
 * triggers a download entirely in the browser.
 */
export async function generateIdCardsPdf(
  students: IdCardStudent[],
  filename: string,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = 210;
  const pageH = 297;
  const cols = 3;
  const rows = 3;
  const perPage = cols * rows;
  const marginX = 12;
  const marginY = 12;
  const gapX = (pageW - 2 * marginX - cols * CARD_WIDTH_MM) / (cols - 1);
  const gapY = (pageH - 2 * marginY - rows * CARD_HEIGHT_MM) / (rows - 1);

  for (let i = 0; i < students.length; i++) {
    const positionOnPage = i % perPage;
    if (i > 0 && positionOnPage === 0) {
      doc.addPage();
    }
    const col = positionOnPage % cols;
    const row = Math.floor(positionOnPage / cols);
    const x = marginX + col * (CARD_WIDTH_MM + gapX);
    const y = marginY + row * (CARD_HEIGHT_MM + gapY);

    const qr = await qrDataUrl(students[i].registration_number);
    drawCard(doc, x, y, students[i], qr);
  }

  doc.save(filename);
}
