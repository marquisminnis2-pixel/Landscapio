import { getClientAirtableConfig, isAirtableConfigured, ClientAirtableConfig } from './airtableConfig';

function baseUrl(cfg: ClientAirtableConfig) {
  return `https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.blogTrackerTable)}`;
}

function headers(cfg: ClientAirtableConfig) {
  return {
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchBlogs(clientId: string, status?: string) {
  const cfg = await getClientAirtableConfig(clientId);
  if (!isAirtableConfigured(cfg)) {
    throw new Error('Airtable not configured for this client');
  }

  const fields = [
    'Blog Title (Topic)',
    'Blog Status',
    'Blog URL',
    'Scheduled Post Date',
    'Blog Thumbnail Status',
    'Blog Images Status',
    'Blog Image 1',
    'Blog Image 2',
    'Blog Image 3',
    'Primary Keyword',
    'Secondary Keyword 1',
    'Secondary Keyword 2',
    'Internal Link 1',
    'Internal Link 2',
    'External Link 1',
    'External Link 2',
    'Blog Outline Status',
    'Blog Outline',
    'Blog Copy',
    'Meta Title',
    'Meta Description',
    'Notes',
  ];
  const fieldParams = fields.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');

  // Paginate through all records (Airtable returns max 100 per request)
  let allRecords: any[] = [];
  let offset: string | undefined;

  do {
    // Fetch in the Airtable "Grid view" order (numbered 1..466 as set up in Airtable).
    // NOTE: a sort param would override the view's order, so we use the view only.
    const viewParam = `&view=${encodeURIComponent('Grid view')}`;
    const filterPart = status && status !== 'All'
      ? `filterByFormula=${encodeURIComponent(`{Blog Status} = "${status}"`)}&`
      : '';
    const url = `${baseUrl(cfg)}?${filterPart}${fieldParams}${viewParam}${offset ? `&offset=${offset}` : ''}`;
    const response = await fetch(url, { headers: headers(cfg) });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Airtable fetch error: ${JSON.stringify(err)}`);
    }
    const data = await response.json() as { records: any[]; offset?: string };
    allRecords = allRecords.concat(data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

// Surfaces exactly why Airtable rejected a config: which piece is missing.
function configError(cfg: ClientAirtableConfig, clientId: string): Error {
  const missing: string[] = [];
  if (!cfg.apiKey || cfg.apiKey === 'your_airtable_api_key_here') missing.push('AIRTABLE_API_KEY env var');
  if (!cfg.baseId) missing.push("client.airtableBaseId (DB field on the Client doc — NOT an env var)");
  return new Error(
    `Airtable not configured for client ${clientId}: missing ${missing.join(' + ') || 'unknown config'}. ` +
    `(apiKey ${cfg.apiKey ? 'present' : 'MISSING'}, baseId "${cfg.baseId}", table "${cfg.blogTrackerTable}")`
  );
}

// Shared PATCH with rich error capture so the real Airtable message reaches the logs.
async function patchRecord(
  cfg: ClientAirtableConfig,
  recordId: string,
  fields: Record<string, string>,
  op: string,
) {
  const url = `${baseUrl(cfg)}/${recordId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: headers(cfg),
    // typecast lets Airtable match/coerce single-select values (e.g. 'Blog Status')
    // instead of 422-ing when the written value isn't an exact existing option.
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!response.ok) {
    const rawBody = await response.text().catch(() => '<unreadable body>');
    console.error(
      `[airtable:${op}] PATCH failed ${response.status} ${response.statusText}\n` +
      `  url: ${url}\n  base: "${cfg.baseId}"  table: "${cfg.blogTrackerTable}"  record: "${recordId}"\n` +
      `  fields sent: ${Object.keys(fields).join(', ')}\n  airtable response: ${rawBody}`
    );
    throw new Error(`Airtable ${op} failed (${response.status} ${response.statusText}): ${rawBody}`);
  }
  return await response.json();
}

export async function markInProgress(clientId: string, recordId: string) {
  const cfg = await getClientAirtableConfig(clientId);
  if (!isAirtableConfigured(cfg)) throw configError(cfg, clientId);
  return patchRecord(cfg, recordId, { 'Blog Status': 'In Progress' }, 'mark-progress');
}

export async function updateBlogRecord(clientId: string, recordId: string, fields: Record<string, string>) {
  const cfg = await getClientAirtableConfig(clientId);
  if (!isAirtableConfigured(cfg)) throw configError(cfg, clientId);
  return patchRecord(cfg, recordId, fields, 'update-blog');
}
