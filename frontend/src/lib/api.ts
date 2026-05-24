// In dev: VITE_API_URL is empty so Vite proxy handles /api/* → localhost:5050
// In production: VITE_API_URL=https://genesis-platform-production.up.railway.app
export const API_BASE = import.meta.env.VITE_API_URL ?? '';
