import { API_BASE } from '@/lib/api';

export async function fetchTemplates() {
  try {
    const res = await fetch(`${API_BASE}/api/templates/list`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    const data = await res.json();
    return data.templates || [];
  } catch (err) {
    console.warn('fetchTemplates error', err);
    return [];
  }
}

export async function uploadTemplate(file: File, name?: string, tags?: string[]) {
  const form = new FormData();
  form.append('template', file);
  if (name) form.append('name', name);
  if (tags) form.append('tags', tags.join(','));

  const res = await fetch(`${API_BASE}/api/templates/import`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function recordTemplatePurchase(orgId: string, templateData: object, token: string) {
  const res = await fetch(`${API_BASE}/api/orgs/${orgId}/template-purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(templateData),
  });
  if (!res.ok) throw new Error('Failed to record purchase');
  return res.json();
}

export async function fetchPurchasedTemplates(orgId: string, token: string) {
  const res = await fetch(`${API_BASE}/api/orgs/${orgId}/template-purchases`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch purchases');
  const data = await res.json();
  return data.purchases || [];
}
