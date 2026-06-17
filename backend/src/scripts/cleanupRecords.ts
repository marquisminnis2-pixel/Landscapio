/**
 * Cleanup pass — clear the blog fields on records that should NOT hold a blog.
 *
 * Input: landscapio_cleanup_records.xlsx (sheet "Cleanup")
 *   columns: Record ID | Action
 *
 * For each row, PATCH the record with id === Record ID:
 *   Blog Title (Topic) → "", Blog Outline → "", Meta Description → "",
 *   Blog Outline Status → Not Started.
 *
 * Airtable: base appUu33K4gO14zeDs, table tbld259C9i8UXVygP.
 *
 * Usage:
 *   npx ts-node src/scripts/cleanupRecords.ts          # DRY RUN
 *   npx ts-node src/scripts/cleanupRecords.ts --live    # write
 */
import dotenv from 'dotenv';
import path from 'path';
import * as XLSX from 'xlsx';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_ID = 'appUu33K4gO14zeDs';
const TABLE_ID = 'tbld259C9i8UXVygP';
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;
const DRY_RUN = !process.argv.includes('--live');
const XLSX_PATH = path.resolve(__dirname, '../../../landscapio_cleanup_records.xlsx');

interface AirtableRecord { id: string; fields: Record<string, any>; }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clean = (s: unknown) => String(s ?? '').trim();

const CLEAR_FIELDS: Record<string, string> = {
  'Blog Title (Topic)': '',
  'Blog Outline': '',
  'Meta Description': '',
  'Blog Outline Status': 'Not Started',
};

async function fetchAllAirtableRecords(apiKey: string): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    let query = 'pageSize=100';
    if (offset) query += `&offset=${encodeURIComponent(offset)}`;
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${query}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch failed ${res.status}: ${await res.text().catch(() => '')}`);
    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    all.push(...data.records);
    offset = data.offset;
  } while (offset);
  return all;
}

async function patchBatch(apiKey: string, records: { id: string; fields: Record<string, string> }[]): Promise<void> {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable PATCH failed ${res.status}: ${await res.text().catch(() => '')}`);
}

async function run() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error('AIRTABLE_API_KEY not set in environment');

  console.log(`\n=== Cleanup Records (${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE — writing'}) ===`);
  console.log(`Input: ${XLSX_PATH}\n`);

  const wb = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const ids = rows.map((r) => clean(r['Record ID'])).filter(Boolean);
  console.log(`xlsx rows read: ${rows.length}  (record IDs: ${ids.length})`);

  const records = await fetchAllAirtableRecords(apiKey);
  const byId = new Map(records.map((r) => [r.id, r]));
  console.log(`Airtable records fetched: ${records.length}\n`);

  const targets: { id: string; currentTitle: string }[] = [];
  const missingId: string[] = [];
  for (const id of ids) {
    const rec = byId.get(id);
    if (!rec) { missingId.push(id); continue; }
    targets.push({ id, currentTitle: clean(rec.fields['Blog Title (Topic)']) || '(empty)' });
  }

  console.log(`Resolved: ${targets.length}/${ids.length}   Missing Record ID: ${missingId.length}\n`);
  console.log('--- First 5 to clear (Record ID → current title that will be wiped) ---');
  targets.slice(0, 5).forEach((t, i) => console.log(`  [#${i + 1}] ${t.id}   current: "${t.currentTitle}"`));
  console.log('');
  if (missingId.length) {
    console.log(`--- Missing/unknown Record IDs (${missingId.length}) — first 10 ---`);
    missingId.slice(0, 10).forEach((id) => console.log(`  "${id}"`));
    console.log('');
  }

  if (DRY_RUN) {
    console.log(`DRY RUN complete — ${targets.length} records WOULD be cleared. No writes made.`);
    console.log('Re-run with --live to perform the cleanup.');
    return;
  }
  if (missingId.length) throw new Error(`Refusing to write: ${missingId.length} unknown Record IDs.`);

  let updated = 0, failed = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    try {
      await patchBatch(apiKey, batch.map((t) => ({ id: t.id, fields: CLEAR_FIELDS })));
      updated += batch.length;
    } catch (err: any) {
      failed += batch.length;
      console.error(`❌ Batch ${i}-${i + batch.length - 1} failed: ${err.message}`);
    }
    if (updated % 10 === 0 || i + BATCH_SIZE >= targets.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, targets.length)}/${targets.length} (cleared ${updated}, failed ${failed})`);
    }
    if (i + BATCH_SIZE < targets.length) await sleep(BATCH_DELAY_MS);
  }
  console.log(`\n=== Summary ===\nResolved : ${targets.length}\nCleared  : ${updated}\nFailed   : ${failed}`);
}

run().catch((err) => { console.error('cleanupRecords failed:', err); process.exit(1); });
