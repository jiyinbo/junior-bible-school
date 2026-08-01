import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import copperplateBoldUrl from '../../assets/certs/Copperplate-Bold.ttf';
import corsivaUrl from '../../assets/certs/Italianno-Regular.ttf';
import statementTemplateUrl from '../../assets/certs/statement-template.pdf';
import certificateTemplateUrl from '../../assets/certs/certificate-template.pdf';
import winnersLogoUrl from '../../assets/certs/winners-logo.png';
import jbsSignatureUrl from '../../assets/certs/JBS Signature.png';

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

const BLACK = rgb(0.08, 0.08, 0.08);
const DARK = rgb(0.15, 0.17, 0.22);
const RED = rgb(0.75, 0.16, 0.16);
const WHITE = rgb(1, 1, 1);
const TABLE_BG = rgb(217 / 255, 217 / 255, 217 / 255);

const STATEMENT_ROWS = 12;
const STATEMENT_ROW_STEP = 21.12;
const STATEMENT_GRADE_YS = Array.from(
  { length: STATEMENT_ROWS },
  (_, i) => 431 - i * STATEMENT_ROW_STEP,
);
const STATEMENT_GRADE_CENTER_X = 461.7;
const STATEMENT_SUBJECT_X = 161.4;

const templateCache = new Map<string, Promise<ArrayBuffer>>();

function loadTemplate(url: string): Promise<ArrayBuffer> {
  const cached = templateCache.get(url);
  if (cached) return cached;
  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to load PDF template (${res.status})`);
    return res.arrayBuffer();
  });
  templateCache.set(url, promise);
  return promise;
}

/** Strips a trailing " - 2026" style year suffix so headings read cleanly. */
function sessionSubtitle(sessionName: string): string {
  return sessionName.replace(/\s*-\s*\d{4}\s*$/, '').trim() || sessionName;
}

function shortLevelName(levelName: string): string {
  return levelName
    .replace(/\b(junior\s+bible\s+school|certificate\s+course|course)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || levelName;
}

/** Statement heading uses the tier stem only, e.g. "Basic (10-12)" → "BASIC". */
function statementTierLabel(levelName: string): string {
  const short = shortLevelName(levelName);
  const stem = short.replace(/\s*\([^)]*\)\s*$/, '').trim() || short;
  return stem.toUpperCase();
}

const MONTH_NAMES =
  'January|February|March|April|May|June|July|August|September|October|November|December';

/** Certificate session line, e.g. "August 2026 Session". */
function formatSessionLabel(sessionName: string, issuedOn: string): string {
  const monthYear = new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{4})\\b`, 'i');
  const fromSession = sessionName.match(monthYear);
  if (fromSession) {
    const month = fromSession[1].charAt(0).toUpperCase() + fromSession[1].slice(1).toLowerCase();
    return `${month} ${fromSession[2]} Session`;
  }
  const fromIssued = issuedOn.match(monthYear);
  if (fromIssued) {
    return `${fromIssued[1]} ${fromIssued[2]} Session`;
  }
  const year =
    sessionName.match(/\b(20\d{2})\b/)?.[1] ?? issuedOn.match(/\b(20\d{2})\b/)?.[1] ?? '';
  return year ? `August ${year} Session` : 'Session';
}

function cover(page: PDFPage, x: number, y: number, width: number, height: number, color = WHITE): void {
  page.drawRectangle({ x, y, width, height, color, borderWidth: 0 });
}

function drawCentered(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = BLACK,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y, size, font, color });
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}${ellipsis}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${text.slice(0, lo).trimEnd()}${ellipsis}` : ellipsis;
}

/** Shrink point size until the full string fits — prefer that over truncating. */
function fitFontSize(
  text: string,
  font: PDFFont,
  maxSize: number,
  minSize: number,
  maxWidth: number,
): number {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return size;
  }
  return minSize;
}

function drawSignature(
  page: PDFPage,
  signature: PDFImage,
  x: number,
  y: number,
  height: number,
): void {
  const width = (signature.width / signature.height) * height;
  page.drawImage(signature, { x, y, width, height });
}

async function fillStatementPage(
  page: PDFPage,
  data: DocumentData,
  font: PDFFont,
  fontBold: PDFFont,
  winnersLogo: PDFImage,
  signature: PDFImage,
): Promise<void> {
  const pageW = page.getWidth();
  const cx = pageW / 2;
  // Past the longest label ("Student Number:") so name / number / date line up.
  const valueX = 175;
  const leftX = 72;

  // Programme heading, e.g. "SUMMER JUNIOR BIBLE SCHOOL (ADVANCED PLUS)"
  cover(page, 40, 568, pageW - 80, 26);
  const heading = `SUMMER JUNIOR BIBLE SCHOOL (${statementTierLabel(data.level_name)})`;
  const headingSize = fitFontSize(heading, fontBold, 16, 11, pageW - 100);
  drawCentered(page, heading, cx, 574, headingSize, fontBold, BLACK);

  // Clear value columns (and the sample date line), then draw aligned values.
  cover(page, valueX - 4, 517, 360, 18);
  page.drawText(fitText(data.full_name, font, 12, 350), {
    x: valueX,
    y: 521,
    size: 12,
    font,
    color: BLACK,
  });

  cover(page, valueX - 4, 496, 360, 18);
  page.drawText(fitText(data.registration_number, font, 12, 350), {
    x: valueX,
    y: 500,
    size: 12,
    font,
    color: BLACK,
  });

  // Template bakes "Date: 1st August 2025" into one run — redraw label + value.
  cover(page, 70, 475, 450, 18);
  page.drawText('Date:', {
    x: 72,
    y: 479,
    size: 12,
    font,
    color: BLACK,
  });
  page.drawText(data.issued_on, {
    x: valueX,
    y: 479,
    size: 12,
    font,
    color: BLACK,
  });

  // Subject titles + grades — only keep as many rows as this tier has modules.
  const usedCount = Math.min(Math.max(data.modules.length, 0), STATEMENT_ROWS);
  for (let i = 0; i < usedCount; i++) {
    const y = STATEMENT_GRADE_YS[i];
    const module = data.modules[i];

    cover(page, 105, y - 2, 20, 16, TABLE_BG); // serial
    cover(page, STATEMENT_SUBJECT_X - 2, y - 2, 280, 16, TABLE_BG);
    cover(page, 448, y - 2, 36, 16, TABLE_BG);

    drawCentered(page, String(module.serial), 114.7, y, 11, font, BLACK);
    page.drawText(fitText(module.name, font, 11, 270), {
      x: STATEMENT_SUBJECT_X,
      y,
      size: 11,
      font,
      color: BLACK,
    });
    drawCentered(page, module.grade, STATEMENT_GRADE_CENTER_X, y, 11, fontBold, BLACK);
  }

  // White out unused template rows (9–12 etc.) and shift footer up under the table.
  const lastRowY = usedCount > 0 ? STATEMENT_GRADE_YS[usedCount - 1] : STATEMENT_GRADE_YS[0];
  const tableBottom = lastRowY - 8;
  const shift = lastRowY - STATEMENT_GRADE_YS[STATEMENT_ROWS - 1];
  cover(page, 50, 0, pageW - 100, tableBottom);

  // Pages export scrambled the Word footer. Redraw: *NS → Overall → Coordinator → logo.
  const nsY = 168 + shift;
  const overallY = 148 + shift;
  const coordY = 110 + shift;
  const lineY = 100 + shift;
  const sigY = 102 + shift;
  const logoY = 42 + shift;

  page.drawText('*NS: No Show', {
    x: leftX,
    y: nsY,
    size: 12,
    font: fontBold,
    color: RED,
  });

  const overall = data.overall_grade_label ? data.overall_grade_label.toUpperCase() : '—';
  page.drawText('Overall Grade:', {
    x: leftX,
    y: overallY,
    size: 12,
    font,
    color: BLACK,
  });
  page.drawText(overall, {
    x: leftX + font.widthOfTextAtSize('Overall Grade:  ', 12),
    y: overallY,
    size: 12,
    font: fontBold,
    color: BLACK,
  });

  page.drawText('JBS Coordinator:', {
    x: leftX,
    y: coordY,
    size: 12,
    font,
    color: BLACK,
  });
  const coordLabelW = font.widthOfTextAtSize('JBS Coordinator:  ', 12);
  page.drawText('____________________', {
    x: leftX + coordLabelW,
    y: lineY,
    size: 12,
    font,
    color: BLACK,
  });
  drawSignature(page, signature, leftX + coordLabelW, sigY, 32);

  const logoH = 28;
  const logoW = (winnersLogo.width / winnersLogo.height) * logoH;
  page.drawImage(winnersLogo, { x: leftX, y: logoY, width: logoW, height: logoH });
  page.drawText("Winners' Chapel International, Dartford", {
    x: leftX + logoW + 8,
    y: logoY + logoH / 2 - 4,
    size: 11,
    font,
    color: BLACK,
  });
}

async function fillCertificatePage(
  page: PDFPage,
  data: DocumentData,
  fontItalic: PDFFont,
  copperplate: PDFFont,
  dateFont: PDFFont,
  signature: PDFImage,
): Promise<void> {
  const pageW = page.getWidth();
  const cx = pageW / 2;

  // Recipient name — sit in the template name band (sample ~y 305–330) so it
  // clears "This is to certify that" above and the fulfilled line below.
  cover(page, 160, 300, 520, 36);
  const nameSize = 32;
  const name = fitText(data.full_name.toUpperCase(), copperplate, nameSize, 500);
  drawCentered(page, name, cx, 306, nameSize, copperplate, DARK);

  // Level (template sample: BASIC)
  cover(page, 290, 165, 260, 40);
  const level = fitText(shortLevelName(data.level_name).toUpperCase(), copperplate, 22, 230);
  drawCentered(page, level, cx, 175, 22, copperplate, RED);

  // Session — keep short, e.g. "AUGUST 2026 SESSION"
  cover(page, 250, 135, 360, 34);
  const session = formatSessionLabel(data.session_name, data.issued_on).toUpperCase();
  drawCentered(page, session, cx, 147, 18, copperplate, BLACK);

  // Date above the right "Date" label — Corsiva-style script (Italianno; OFL stand-in
  // for Monotype Corsiva used in the Word template).
  cover(page, 520, 58, 180, 28);
  const dateCx = 600;
  drawCentered(page, data.issued_on, dateCx, 64, 22, dateFont, BLACK);

  // Template bakes "WOFBI Coordinator" under the left signature line.
  cover(page, 145, 40, 170, 16);
  page.drawText('JBS Coordinator', {
    x: 168,
    y: 45,
    size: 10,
    font: fontItalic,
    color: BLACK,
  });

  // Signature sits just above the left signature line (label at y≈45).
  const sigH = 40;
  const sigW = (signature.width / signature.height) * sigH;
  const labelW = fontItalic.widthOfTextAtSize('JBS Coordinator', 10);
  drawSignature(page, signature, 168 + (labelW - sigW) / 2, 62, sigH);
}

async function buildStatementsPdf(list: DocumentData[]): Promise<Uint8Array> {
  const [templateBytes, winnersBytes, signatureBytes] = await Promise.all([
    loadTemplate(statementTemplateUrl),
    loadTemplate(winnersLogoUrl),
    loadTemplate(jbsSignatureUrl),
  ]);
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const fontBold = await out.embedFont(StandardFonts.HelveticaBold);
  const winnersLogo = await out.embedPng(winnersBytes);
  const signature = await out.embedPng(signatureBytes);

  for (const data of list) {
    const template = await PDFDocument.load(templateBytes.slice(0));
    // Page 2 only had the overflowed controller line — page 1 is the designed sheet.
    const [page] = await out.copyPages(template, [0]);
    out.addPage(page);
    await fillStatementPage(page, data, font, fontBold, winnersLogo, signature);
  }

  return out.save();
}

async function buildCertificatesPdf(list: DocumentData[]): Promise<Uint8Array> {
  const [templateBytes, copperplateBytes, corsivaBytes, signatureBytes] = await Promise.all([
    loadTemplate(certificateTemplateUrl),
    loadTemplate(copperplateBoldUrl),
    loadTemplate(corsivaUrl),
    loadTemplate(jbsSignatureUrl),
  ]);
  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const fontItalic = await out.embedFont(StandardFonts.HelveticaOblique);
  const copperplate = await out.embedFont(copperplateBytes);
  const dateFont = await out.embedFont(corsivaBytes);
  const signature = await out.embedPng(signatureBytes);

  for (const data of list) {
    const template = await PDFDocument.load(templateBytes.slice(0));
    const [page] = await out.copyPages(template, [0]);
    out.addPage(page);
    await fillCertificatePage(page, data, fontItalic, copperplate, dateFont, signature);
  }

  return out.save();
}

function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateStatementPdf(data: DocumentData, filename: string): Promise<void> {
  downloadPdf(await buildStatementsPdf([data]), filename);
}

export async function generateCertificatePdf(data: DocumentData, filename: string): Promise<void> {
  downloadPdf(await buildCertificatesPdf([data]), filename);
}

export async function generateStatementsPdf(list: DocumentData[], filename: string): Promise<void> {
  downloadPdf(await buildStatementsPdf(list), filename);
}

export async function generateCertificatesPdf(list: DocumentData[], filename: string): Promise<void> {
  downloadPdf(await buildCertificatesPdf(list), filename);
}
