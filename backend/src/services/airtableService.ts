import { getClientAirtableConfig, isAirtableConfigured } from './airtableConfig';

interface BlogAirtablePayload {
  clientId: string;
  blogTitle: string;
  blogContent: string;
  blogUrl?: string;
  scheduledPostDate?: string;
  blogThumbnailStatus?: string;
  blogImagesStatus?: string;
  blogImage1?: string;
  blogImage2?: string;
  blogImage3?: string;
  primaryKeyword?: string;
  secondaryKeyword1?: string;
  secondaryKeyword2?: string;
  internalLink1?: string;
  internalLink2?: string;
  externalLink1?: string;
  externalLink2?: string;
  blogOutlineStatus?: string;
  blogOutline?: string;
  metaTitle?: string;
  metaDescription?: string;
  notes?: string;
  status?: 'Not Started' | 'Created' | 'Posted';
}

/**
 * Append a new row to the client's Blog Tracker in Airtable, pre-filled with
 * the generated blog. Uses the real Blog Tracker field names so the row slots
 * straight into the existing SEO Campaign workflow.
 */
export async function logBlogToAirtable(payload: BlogAirtablePayload) {
  const cfg = await getClientAirtableConfig(payload.clientId);
  if (!isAirtableConfigured(cfg)) {
    console.warn(`Airtable not configured for client ${payload.clientId} — skipping log`);
    return null;
  }

  const url = `https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(cfg.blogTrackerTable)}`;

  const fields: Record<string, string> = {
    'Blog Title (Topic)': payload.blogTitle || '',
    'Blog Copy': payload.blogContent || '',
    'Blog Status': payload.status || 'Created',
  };
  if (payload.blogUrl) fields['Blog URL'] = payload.blogUrl;
  if (payload.scheduledPostDate) fields['Scheduled Post Date'] = payload.scheduledPostDate;
  if (payload.blogThumbnailStatus) fields['Blog Thumbnail Status'] = payload.blogThumbnailStatus;
  if (payload.blogImagesStatus) fields['Blog Images Status'] = payload.blogImagesStatus;
  if (payload.blogImage1) fields['Blog Image 1'] = payload.blogImage1;
  if (payload.blogImage2) fields['Blog Image 2'] = payload.blogImage2;
  if (payload.blogImage3) fields['Blog Image 3'] = payload.blogImage3;
  if (payload.primaryKeyword) fields['Primary Keyword'] = payload.primaryKeyword;
  if (payload.secondaryKeyword1) fields['Secondary Keyword 1'] = payload.secondaryKeyword1;
  if (payload.secondaryKeyword2) fields['Secondary Keyword 2'] = payload.secondaryKeyword2;
  if (payload.internalLink1) fields['Internal Link 1'] = payload.internalLink1;
  if (payload.internalLink2) fields['Internal Link 2'] = payload.internalLink2;
  if (payload.externalLink1) fields['External Link 1'] = payload.externalLink1;
  if (payload.externalLink2) fields['External Link 2'] = payload.externalLink2;
  if (payload.blogOutlineStatus) fields['Blog Outline Status'] = payload.blogOutlineStatus;
  if (payload.blogOutline) fields['Blog Outline'] = payload.blogOutline;
  if (payload.metaTitle) fields['Meta Title'] = payload.metaTitle;
  if (payload.metaDescription) fields['Meta Description'] = payload.metaDescription;
  if (payload.notes) fields['Notes'] = payload.notes;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Airtable error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}
