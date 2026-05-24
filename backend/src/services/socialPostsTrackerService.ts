import { getClientAirtableConfig, isAirtableConfigured, ClientAirtableConfig } from './airtableConfig';

function baseUrl(cfg: ClientAirtableConfig) {
  return `https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.socialPostsTable)}`;
}

function headers(cfg: ClientAirtableConfig) {
  return {
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
  };
}

const SOCIAL_FIELDS = [
  'Post Date',
  'Post Status',
  'Primary Keyword',
  'Target Service URL',
  'Copy Status',
  'Post Caption',
  'Design Post Status',
  'Post Image',
  'Notes',
];

export async function fetchSocialPosts(clientId: string, copyStatus?: string) {
  const cfg = await getClientAirtableConfig(clientId);
  if (!isAirtableConfigured(cfg)) {
    throw new Error('Airtable not configured for this client');
  }

  const fieldParams = SOCIAL_FIELDS.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
  const sortParam = `&sort[0][field]=${encodeURIComponent('Post Date')}&sort[0][direction]=asc`;

  let allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const filterPart = copyStatus && copyStatus !== 'All'
      ? `filterByFormula=${encodeURIComponent(`{Copy Status} = "${copyStatus}"`)}&`
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

export async function updateSocialPostRecord(clientId: string, recordId: string, fields: Record<string, string>) {
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

interface LogSocialPostPayload {
  clientId: string;
  primaryKeyword?: string;
  targetServiceUrl?: string;
  postCaption: string;
  postDate?: string;
  copyStatus?: 'Not Started' | 'Created' | 'Posted';
  notes?: string;
}

export async function logSocialPostToAirtable(payload: LogSocialPostPayload) {
  const cfg = await getClientAirtableConfig(payload.clientId);
  if (!isAirtableConfigured(cfg)) {
    console.warn(`Airtable not configured for client ${payload.clientId} — skipping social post log`);
    return null;
  }

  const fields: Record<string, string> = {
    'Post Caption': payload.postCaption || '',
    'Copy Status': payload.copyStatus || 'Created',
  };
  if (payload.primaryKeyword) fields['Primary Keyword'] = payload.primaryKeyword;
  if (payload.targetServiceUrl) fields['Target Service URL'] = payload.targetServiceUrl;
  if (payload.postDate) fields['Post Date'] = payload.postDate;
  if (payload.notes) fields['Notes'] = payload.notes;

  const response = await fetch(baseUrl(cfg), {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Airtable error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}
