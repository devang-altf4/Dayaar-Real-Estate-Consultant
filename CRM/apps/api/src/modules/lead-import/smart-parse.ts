import * as XLSX from 'xlsx';

export interface RawLeadRow {
  name?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  project?: string;
  source?: string;
  campaign?: string;
  notes?: string;
}

export interface ParsedTabularInput {
  rows: RawLeadRow[];
  warnings: string[];
}

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

interface PhoneMatch {
  normalized: string;
  raw: string;
}

function normalizeRunDigits(digits: string): string[] {
  let d = digits;
  if (/^0091\d{10,}$/.test(d)) d = d.slice(4);
  else if (/^91\d{10,}$/.test(d)) d = d.slice(2);
  else if (/^0\d{10,}$/.test(d)) d = d.slice(1);

  if (/^[6-9]\d{9}$/.test(d)) return [d];

  const found: string[] = [];
  for (const m of d.matchAll(/(?:91|0)?([6-9]\d{9})/g)) {
    const candidate = m[1];
    if (!found.includes(candidate)) found.push(candidate);
  }
  return found;
}

/**
 * Finds Indian mobile numbers inside free/messy text.
 * Handles "+91 98765 43210", "09876543210", "98765-43210",
 * and multiple numbers separated by spaces or punctuation.
 */
export function findPhoneMatches(text: string): PhoneMatch[] {
  const matches: PhoneMatch[] = [];
  const seenNormalized = new Set<string>();
  const seenRaw = new Set<string>();
  if (!text) return matches;

  // Runs of digits plus characters that commonly sit INSIDE a written number.
  const runs = text.match(/[0-9][0-9\s\-().]{8,}/g) || [];
  for (const run of runs) {
    const normalizedList = normalizeRunDigits(run.replace(/\D/g, ''));
    if (normalizedList.length === 0) continue;
    if (!seenRaw.has(run)) seenRaw.add(run);
    for (const normalized of normalizedList) {
      if (!seenNormalized.has(normalized)) {
        seenNormalized.add(normalized);
        matches.push({ normalized, raw: run });
      }
    }
  }
  return matches;
}

export function extractPhonesFromText(text: string): string[] {
  return findPhoneMatches(text).map((m) => m.normalized);
}

/**
 * Splits a single cell that mixes a name and one or more numbers,
 * e.g. "Aarav Gupta - 9811002233" -> { namePart: "Aarav Gupta", phones: ["9811002233"] }.
 */
export function smartSplitCell(cell: string): {
  namePart: string;
  phones: string[];
  email?: string;
} {
  if (!cell || !cell.trim()) return { namePart: '', phones: [] };

  const emailMatch = cell.match(EMAIL_REGEX);
  const email = emailMatch ? emailMatch[0] : undefined;
  let remainder = cell.replace(EMAIL_REGEX, ' ');

  const matches = findPhoneMatches(remainder);
  const phones = matches.map((m) => m.normalized);
  for (const match of matches) {
    remainder = remainder.split(match.raw).join(' ');
  }

  const namePart = remainder
    .replace(/[\s]*[|;:,\/\-–—+#*&.]+[\s]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\-–—#*+&,.;:]+\s*/, '')
    .replace(/[\s\-–—#*+&,.;:]+$/, '');

  return { namePart, phones, email };
}

/** RFC-4180-ish single-line splitter honoring double quotes. */
function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function looksLikeHeaderRow(cells: string[]): boolean {
  return cells.some((c) =>
    /(name|phone|mobile|number|contact|whatsapp|email|project|source|campaign|note|remark|alt|other)/i.test(c),
  );
}

function detectDelimiter(text: string): string {
  const sampleLines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 5);
  const candidates = ['\t', ';', ',', '|'];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    const counts = sampleLines.map((l) => l.split(d).length - 1);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total > bestCount) {
      best = d;
      bestCount = total;
    }
  }
  return best;
}

type ColumnKey = keyof RawLeadRow | null;

function mapHeaders(headers: string[]): ColumnKey[] {
  return headers.map((h) => {
    const value = h.toLowerCase().trim();
    if (!value) return null;
    if (/(alt|alternate|other)/.test(value) && /(phone|mobile|number|contact)/.test(value)) {
      return 'alternatePhone';
    }
    if (/(phone|mobile|whatsapp|number|contact)/.test(value)) return 'phone';
    if (/name/.test(value)) return 'name';
    if (/email/.test(value)) return 'email';
    if (/project/.test(value)) return 'project';
    if (/source/.test(value)) return 'source';
    if (/campaign/.test(value)) return 'campaign';
    if (/note|remark/.test(value)) return 'notes';
    return null;
  });
}

const DIRECT_FIELDS: Array<Exclude<ColumnKey, null>> = [
  'project',
  'source',
  'campaign',
  'notes',
];

interface RowCollector {
  phones: string[];
  nameParts: string[];
  email?: string;
}

function collectCell(collector: RowCollector, cell: string, key: ColumnKey): void {
  const { namePart, phones, email } = smartSplitCell(cell);

  if (key && (DIRECT_FIELDS as string[]).includes(key)) {
    const collectorFields = collector as unknown as Record<string, string | undefined>;
    if (!collectorFields[key]) collectorFields[key] = cell;
  }

  for (const p of phones) {
    if (!collector.phones.includes(p)) collector.phones.push(p);
  }

  const preferredName = key === 'name' && namePart;
  if (preferredName) {
    collector.nameParts.unshift(namePart);
  } else if (!key && namePart) {
    collector.nameParts.push(namePart);
  }

  if (email && !collector.email) collector.email = email;
}

function finalizeRow(collector: RowCollector, hadMappedNameColumn: boolean): RawLeadRow {
  const row: RawLeadRow = {};
  const fields = collector as unknown as Record<string, string | undefined>;

  if (collector.phones.length > 0) row.phone = collector.phones[0];
  if (collector.phones.length > 1) row.alternatePhone = collector.phones[1];
  if (collector.email) row.email = collector.email;

  const name = collector.nameParts.join(' ').replace(/\s+/g, ' ').trim();
  if (name) row.name = name;

  for (const field of DIRECT_FIELDS) {
    const value = fields[field];
    if (value) (row as Record<string, unknown>)[field] = value;
  }

  void hadMappedNameColumn;
  return row;
}

/**
 * Parses pasted tabular text (CSV/TSV/semicolon lists/one-per-line dumps).
 * Works with or without headers and splits mixed name+number content.
 */
export function parseTabularText(text: string): ParsedTabularInput {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], warnings: ['No content found.'] };

  const delimiter = detectDelimiter(text);
  const grid = lines.map((l) => splitDelimitedLine(l, delimiter));

  let columnMap: ColumnKey[] | null = null;
  let dataRows = grid;
  if (grid.length > 0 && looksLikeHeaderRow(grid[0])) {
    columnMap = mapHeaders(grid[0]);
    dataRows = grid.slice(1);
  }

  const rows: RawLeadRow[] = [];
  for (const cells of dataRows) {
    const collector: RowCollector = { phones: [], nameParts: [] };
    for (let idx = 0; idx < cells.length; idx++) {
      const cell = cells[idx];
      if (!cell) continue;
      const key = columnMap ? columnMap[idx] ?? null : null;
      collectCell(collector, cell, key);
    }

    const row = finalizeRow(collector, Boolean(columnMap?.includes('name')));
    if (row.phone) {
      rows.push(row);
    } else if (cells.some(Boolean)) {
      warnings.push(`Skipped a row with no usable phone number: "${cells.filter(Boolean).join(' ')}".`);
    }
  }

  return { rows, warnings };
}

/** Parses an uploaded Excel workbook into tabular text rows via SheetJS. */
export function parseWorkbookBuffer(buffer: Buffer): ParsedTabularInput {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], warnings: ['The workbook has no sheets.'] };

  const grid = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  const text = grid
    .map((cells) =>
      cells
        .map((c) => String(c ?? '').trim())
        .map((c) => (c.includes(',') || c.includes('\t') ? `"${c.replace(/"/g, '""')}"` : c))
        .join(','),
    )
    .join('\n');

  return parseTabularText(text);
}
