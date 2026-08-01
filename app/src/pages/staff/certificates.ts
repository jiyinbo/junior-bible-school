import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import copperplateBoldUrl from '../../assets/certs/Copperplate-Bold.ttf';
import statementTemplateUrl from '../../assets/certs/statement-template.pdf';
import certificateTemplateUrl from '../../assets/certs/certificate-template.pdf';
import winnersLogoUrl from '../../assets/certs/winners-logo.png';

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
const STATEMENT_GRADE_YS = Array.from({ length: STATEMENT_ROWS }, (_, i) => 431 - i * 21.12);
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

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = BLACK,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font, color });
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

async function fillStatementPage(
  page: PDFPage,
  data: DocumentData,
  font: PDFFont,
  fontBold: PDFFont,
  winnersLogo: PDFImage,
): Promise<void> {
  const pageW = page.getWidth();
  const cx = pageW / 2;
  // Past the longest label ("Student Number:") so name / number / date line up.
  const valueX = 175;
  const leftX = 72;

  // Programme heading, e.g. "SUMMER JUNIOR BIBLE SCHOOL (BASIC)"
  cover(page, 90, 568, 420, 26);
  const heading = `SUMMER JUNIOR BIBLE SCHOOL (${statementTierLabel(data.level_name)})`;
  drawCentered(page, fitText(heading, fontBold, 16, 400), cx, 574, 16, fontBold, BLACK);

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

  // Subject titles + grades (cover sample Basic rows, redraw from API data)
  for (let i = 0; i < STATEMENT_ROWS; i++) {
    const y = STATEMENT_GRADE_YS[i];
    const module = data.modules[i];

    cover(page, STATEMENT_SUBJECT_X - 2, y - 2, 280, 16, TABLE_BG);
    cover(page, 448, y - 2, 36, 16, TABLE_BG);

    if (!module) continue;

    page.drawText(fitText(module.name, font, 11, 270), {
      x: STATEMENT_SUBJECT_X,
      y,
      size: 11,
      font,
      color: BLACK,
    });
    drawCentered(page, module.grade, STATEMENT_GRADE_CENTER_X, y, 11, fontBold, BLACK);
  }

  // Pages export scrambled the Word footer. Wipe below the table and redraw in
  // template order: *NS → Overall Grade → Controller → Winners' Chapel.
  cover(page, 50, 0, pageW - 100, 188);

  page.drawText('*NS: No Show', {
    x: leftX,
    y: 165,
    size: 12,
    font: fontBold,
    color: RED,
  });

  const overall = data.overall_grade_label ? data.overall_grade_label.toUpperCase() : '—';
  page.drawText('Overall Grade:', {
    x: leftX,
    y: 140,
    size: 12,
    font,
    color: BLACK,
  });
  page.drawText(overall, {
    x: leftX + font.widthOfTextAtSize('Overall Grade:  ', 12),
    y: 140,
    size: 12,
    font: fontBold,
    color: BLACK,
  });

  page.drawText('Controller of Examinations: ____________________________', {
    x: leftX,
    y: 110,
    size: 12,
    font,
    color: BLACK,
  });

  const logoH = 28;
  const logoW = (winnersLogo.width / winnersLogo.height) * logoH;
  page.drawImage(winnersLogo, { x: leftX, y: 42, width: logoW, height: logoH });
  page.drawText("Winners' Chapel International, Dartford", {
    x: leftX + logoW + 8,
    y: 42 + logoH / 2 - 4,
    size: 11,
    font,
    color: BLACK,
  });
}

async function fillCertificatePage(
  page: PDFPage,
  data: DocumentData,
  font: PDFFont,
  copperplate: PDFFont,
): Promise<void> {
  const pageW = page.getWidth();
  const cx = pageW / 2;

  // Recipient name — template uses Copperplate Bold ~25pt
  cover(page, 180, 298, 480, 40);
  const name = fitText(data.full_name.toUpperCase(), copperplate, 25, 460);
  drawCentered(page, name, cx, 306, 25, copperplate, DARK);

  // Level (template sample: BASIC)
  cover(page, 290, 165, 260, 40);
  const level = fitText(shortLevelName(data.level_name).toUpperCase(), copperplate, 22, 230);
  drawCentered(page, level, cx, 175, 22, copperplate, RED);

  // Session — keep short, e.g. "AUGUST 2026 SESSION"
  cover(page, 250, 135, 360, 34);
  const session = formatSessionLabel(data.session_name, data.issued_on).toUpperCase();
  drawCentered(page, session, cx, 147, 18, copperplate, BLACK);

  // Date right-aligned to the "Date" label / signature line
  cover(page, 540, 60, 160, 18);
  drawRight(page, data.issued_on, 640, 66, 11, font, BLACK);
}

async function buildStatementsPdf(list: DocumentData[]): Promise<Uint8Array> {
  const [templateBytes, winnersBytes] = await Promise.all([
    loadTemplate(statementTemplateUrl),
    loadTemplate(winnersLogoUrl),
  ]);
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const fontBold = await out.embedFont(StandardFonts.HelveticaBold);
  const winnersLogo = await out.embedPng(winnersBytes);

  for (const data of list) {
    const template = await PDFDocument.load(templateBytes.slice(0));
    // Page 2 only had the overflowed controller line — page 1 is the designed sheet.
    const [page] = await out.copyPages(template, [0]);
    out.addPage(page);
    await fillStatementPage(page, data, font, fontBold, winnersLogo);
  }

  return out.save();
}

async function buildCertificatesPdf(list: DocumentData[]): Promise<Uint8Array> {
  const [templateBytes, copperplateBytes] = await Promise.all([
    loadTemplate(certificateTemplateUrl),
    loadTemplate(copperplateBoldUrl),
  ]);
  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const copperplate = await out.embedFont(copperplateBytes);

  for (const data of list) {
    const template = await PDFDocument.load(templateBytes.slice(0));
    const [page] = await out.copyPages(template, [0]);
    out.addPage(page);
    await fillCertificatePage(page, data, font, copperplate);
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
