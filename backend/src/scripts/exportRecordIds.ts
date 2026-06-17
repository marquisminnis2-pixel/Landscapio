/**
 * Export every Airtable record's Record ID + Primary Keyword + current title to CSV,
 * so a proper Record-ID join key can be built for finalImportByKey.
 *
 * NOTE: exports ALL records (not just the first 466) — the 466 blog records are
 * NOT the first 466 in default API order, so slicing would drop the right ones.
 *
 * Usage: npx ts-node src/scripts/exportRecordIds.ts
 * Output: landscapio.co ai bot/agent-landscapio/airtable_record_ids.csv
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_ID = 'appUu33K4gO14zeDs';
const TABLE_ID = 'tbld259C9i8UXVygP';
const OUT = path.resolve(__dirname, '../../../airtable_record_ids.csv');

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function run() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error('AIRTABLE_API_KEY not set');

  const all: any[] = [];
  let offset: string | undefined;
  do {
    let q = 'pageSize=100';
    if (offset) q += `&offset=${encodeURIComponent(offset)}`;
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${q}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch failed ${res.status}: ${await res.text().catch(() => '')}`);
    const data = (await res.json()) as { records: any[]; offset?: string };
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  const lines = ['Record ID,Primary Keyword,Blog Title (Topic),Blog Outline Status'];
  for (const r of all) {
    lines.push([
      csvCell(r.id),
      csvCell(r.fields['Primary Keyword']),
      csvCell(r.fields['Blog Title (Topic)']),
      csvCell(r.fields['Blog Outline Status']),
    ].join(','));
  }
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`Exported ${all.length} records → ${OUT}`);
}

run().catch((err) => { console.error('exportRecordIds failed:', err); process.exit(1); });
