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
    const sortParam = `&sort[0][field]=${encodeURIComponent('Scheduled Post Date')}&sort[0][direction]=asc`;
    const filterPart = status && status !== 'All'
      ? `filterByFormula=${encodeURIComponent(`{Blog Status} = "${status}"`)}&`
      : '';
    const url = `${baseUrl(cfg)}?${filterPart}${fieldParams}${sortParam}${offset ? `&offset=${offset}` : ''}`;
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

export async function markInProgress(clientId: string, recordId: string) {
  const cfg = await getClientAirtableConfig(clientId);
  if (!isAirtableConfigured(cfg)) {
    throw new Error('Airtable not configured for this client');
  }
  const response = await fetch(`${baseUrl(cfg)}/${recordId}`, {
    method: 'PATCH',
    headers: headers(cfg),
    body: JSON.stringify({ fields: { 'Blog Status': 'In Progress' } }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Airtable update error: ${JSON.stringify(err)}`);
  }
  return await response.json();
}

export async function updateBlogRecord(clientId: string, recordId: string, fields: Record<string, string>) {
  const cfg = await getClientAirtableConfig(clientId);
  if (!isAirtableConfigured(cfg)) {
    throw new Error('Airtable not configured for this client');
  }
  const response = await fetch(`${baseUrl(cfg)}/${recordId}`, {
    method: 'PATCH',
    headers: headers(cfg),
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Airtable update error: ${JSON.stringify(err)}`);
  }
  return await response.json();
}
