// In dev: VITE_API_URL is empty so Vite proxy handles /api/* → localhost:5050
// In production: VITE_API_URL=https://genesis-platform-production.up.railway.app
export const API_BASE = import.meta.env.VITE_API_URL ?? '';

import { clearActiveClient } from './activeClient';

// Matches the backend's "Client <id> not found" / "Client not found" errors,
// which fire when the persisted activeClientId points at a client that no
// longer exists (e.g. it was soft-deleted). See models/Client.ts — the
// `deletedAt: null` pre-find hook makes findById() return null for such ids.
function looksLikeClientNotFound(body: unknown): boolean {
  const err =
    body && typeof body === 'object' && 'error' in body && typeof (body as any).error === 'string'
      ? (body as any).error
      : '';
  return /client(\s+[a-f0-9]{24})?\s+not\s+found/i.test(err);
}

// Guard so concurrent failing requests only trigger one redirect.
let handlingStaleClient = false;

function handleStaleActiveClient(): void {
  if (handlingStaleClient) return;
  handlingStaleClient = true;
  // Drop the dead id so no tool keeps sending it, then bounce to the client
  // picker so the user re-selects instead of staring at a confusing error.
  clearActiveClient();
  try {
    sessionStorage.setItem('clientNotFoundNotice', '1');
  } catch {
    /* sessionStorage unavailable — non-fatal */
  }
  if (typeof window !== 'undefined') {
    if (!window.location.pathname.startsWith('/clients')) {
      window.location.assign('/clients');
    } else {
      window.location.reload();
    }
  }
}

/**
 * fetch wrapper that self-heals a stale/deleted active client.
 *
 * Behaves exactly like fetch() for callers (returns the original Response,
 * body untouched), but transparently inspects JSON error responses: if the
 * backend reports the active client no longer exists, it clears the persisted
 * activeClientId and redirects to /clients to re-select.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const body = await res.clone().json();
      if (looksLikeClientNotFound(body)) {
        handleStaleActiveClient();
      }
    } catch {
      /* not JSON / parse error — leave the response untouched */
    }
  }
  return res;
}
