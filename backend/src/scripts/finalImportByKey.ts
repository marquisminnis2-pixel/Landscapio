/**
 * Final corrective import — join on Airtable RECORD ID (exact, identity-keyed).
 *
 * Input: landscapio_correct_import.xlsx (sheet "Import Data")
 *   columns: Record ID | Primary Keyword | Blog Title | Blog Outline | Meta Description
 *
 * For each row, PATCH the record with id === Record ID:
 *   Blog Title (Topic) ← Blog Title, Blog Outline ← Blog Outline,
 *   Meta Description ← Meta Description, Blog Outline Status ← Completed.
 *
 * SAFETY GATE: the file's Primary Keyword must equal the record's ACTUAL Primary
 * Keyword (the PK column was never modified). If they differ, the Record ID is
 * wrong — the script refuses to write.
 *
 * Airtable: base appUu33K4gO14zeDs, table tbld259C9i8UXVygP.
 *
 * Usage:
 *   npx ts-node src/scripts/finalImportByKey.ts                 # DRY RUN
 *   npx ts-node src/scripts/finalImportByKey.ts --live          # write
 *   npx ts-node src/scripts/finalImportByKey.ts --file=foo.xlsx # override input
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
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const XLSX_PATH = path.resolve(__dirname, '../../../', fileArg ? fileArg.slice('--file='.length) : 'landscapio_correct_import.xlsx');

interface AirtableRecord { id: string; fields: Record<string, any>; }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clean = (s: unknown) => String(s ?? '').trim();
const norm = (s: unknown) => clean(s).toLowerCase();

function readRows() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
  if (rows.length && !('Record ID' in rows[0])) {
    throw new Error(`Missing "Record ID" column. Found: ${Object.keys(rows[0]).join(', ')}`);
  }
  return rows.map((r) => ({
    recordId: clean(r['Record ID']),
    filePk: clean(r['Primary Keyword']),
    title: clean(r['Blog Title']),
    outline: clean(r['Blog Outline']),
    meta: clean(r['Meta Description']),
  }));
}

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

  console.log(`\n=== Final Import by Record ID (${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE — writing'}) ===`);
  console.log(`Input: ${XLSX_PATH}\n`);

  const rows = readRows();
  console.log(`xlsx rows read: ${rows.length}`);

  const records = await fetchAllAirtableRecords(apiKey);
  const byId = new Map(records.map((r) => [r.id, r]));
  console.log(`Airtable records fetched: ${records.length}\n`);

  const updates: { id: string; filePk: string; airtablePk: string; pkOk: boolean; newTitle: string; fields: Record<string, string> }[] = [];
  const missingId: { row: number; recordId: string }[] = [];
  const dupId: { row: number; recordId: string }[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, i) => {
    if (!row.recordId) { missingId.push({ row: i + 1, recordId: '(blank)' }); return; }
    const rec = byId.get(row.recordId);
    if (!rec) { missingId.push({ row: i + 1, recordId: row.recordId }); return; }
    if (seen.has(row.recordId)) { dupId.push({ row: i + 1, recordId: row.recordId }); return; }
    seen.set(row.recordId, i + 1);
    const airtablePk = clean(rec.fields['Primary Keyword']);
    updates.push({
      id: row.recordId,
      filePk: row.filePk,
      airtablePk,
      pkOk: norm(row.filePk) === norm(airtablePk),
      newTitle: row.title,
      fields: {
        'Blog Title (Topic)': row.title,
        'Blog Outline': row.outline,
        'Meta Description': row.meta,
        'Blog Outline Status': 'Completed',
      },
    });
  });

  const pkMismatches = updates.filter((u) => !u.pkOk);
  console.log(`Resolved: ${updates.length}/${rows.length}   Missing Record ID: ${missingId.length}   Duplicate Record ID: ${dupId.length}`);
  console.log(`Primary-Keyword gate (file PK == record PK): ${updates.length - pkMismatches.length}/${updates.length} OK\n`);

  console.log('--- First 5 (Record ID → new title; PK verified) ---');
  for (let i = 0; i < Math.min(5, updates.length); i++) {
    const u = updates[i];
    console.log(`\n[#${i + 1}] ${u.id}   ${u.pkOk ? '✓' : '✗ PK MISMATCH'} (PK="${u.airtablePk}")`);
    console.log(`  → new title: ${u.newTitle}`);
  }
  console.log('');

  if (pkMismatches.length) {
    console.log(`⚠️  ${pkMismatches.length} PK mismatch(es) — Record IDs wrong. First 10:`);
    pkMismatches.slice(0, 10).forEach((u) => console.log(`  ${u.id}: file PK="${u.filePk}" vs record PK="${u.airtablePk}"`));
    console.log('');
  }
  if (missingId.length) {
    console.log(`--- Missing/unknown Record IDs (${missingId.length}) — first 10 ---`);
    missingId.slice(0, 10).forEach((m) => console.log(`  row ${m.row}: id="${m.recordId}"`));
    console.log('');
  }
  if (dupId.length) console.log(`⚠️  ${dupId.length} duplicate Record ID(s) in the file.\n`);

  if (DRY_RUN) {
    console.log(`DRY RUN complete — ${updates.length} WOULD update. No writes made.`);
    console.log('Re-run with --live to perform the import.');
    return;
  }
  if (missingId.length) throw new Error(`Refusing to write: ${missingId.length} rows have missing/unknown Record IDs.`);
  if (pkMismatches.length) throw new Error(`Refusing to write: ${pkMismatches.length} rows have a Primary-Keyword mismatch (Record IDs wrong).`);

  let updated = 0, failed = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    try {
      await patchBatch(apiKey, batch.map((u) => ({ id: u.id, fields: u.fields })));
      updated += batch.length;
    } catch (err: any) {
      failed += batch.length;
      console.error(`❌ Batch ${i}-${i + batch.length - 1} failed: ${err.message}`);
    }
    if (updated % 10 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length} (updated ${updated}, failed ${failed})`);
    }
    if (i + BATCH_SIZE < updates.length) await sleep(BATCH_DELAY_MS);
  }
  console.log(`\n=== Summary ===\nResolved : ${updates.length}\nUpdated  : ${updated}\nFailed   : ${failed}`);
}

run().catch((err) => { console.error('finalImportByKey failed:', err); process.exit(1); });
