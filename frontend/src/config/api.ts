/**
 * Robust API base URL resolution for Vercel production + local dev.
 * Priority order:
 *   1. VITE_API_URL  (explicit Vercel env var)
 *   2. VITE_BACKEND_URL  (alternate env var name)
 *   3. VITE_API_BASE_URL  (legacy name)
 *   4. Localhost detected at runtime → use local backend
 *   5. Fallback to the Render.com deployment URL
 */
const getBaseUrl = (): string => {
  // Vite env vars (evaluated at build time)
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL as string;
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL as string;

  // Runtime hostname check (safe in browser; skipped during SSR/test)
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    }
  }

  // Hardcoded Render fallback — ensures Vercel production never hits a blank URL
  return 'https://sehatmitra-ai.onrender.com/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export default API_BASE_URL;
