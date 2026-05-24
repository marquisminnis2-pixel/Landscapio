// Persistent "currently active client" — shared across the AI tools so a user
// can pick a client in /clients and have every tool act on that client.

const KEY = 'activeClientId';
const NAME_KEY = 'activeClientName';

export function getActiveClientId(): string | null {
  return localStorage.getItem(KEY);
}

export function getActiveClientName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setActiveClient(id: string, name: string): void {
  localStorage.setItem(KEY, id);
  localStorage.setItem(NAME_KEY, name);
}

export function clearActiveClient(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(NAME_KEY);
}
