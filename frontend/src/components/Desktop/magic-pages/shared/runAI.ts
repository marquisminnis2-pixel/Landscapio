import { API_BASE } from '@/lib/api';

export interface PageSection {
  id: string;
  name: string;
  heading: string;
  subheading: string | null;
  body: string;
  listItems: string[] | null;
}

export interface MagicPagesOutput {
  metaTitle: string;
  metaDescription: string;
  wordCount: number;
  sections: PageSection[];
  error?: string;
}

export async function runMagicPagesAI(userPrompt: string): Promise<MagicPagesOutput> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/ai/pages/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userPrompt }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json() as { text: string };
  const clean = data.text.replace(/```json\n?|```\n?/g, '').trim();
  return JSON.parse(clean) as MagicPagesOutput;
}
