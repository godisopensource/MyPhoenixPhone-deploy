// Centralized API base URL resolver for client-side code
// Priority:
// - In browser localhost, use local backend http://localhost:3003 for dev
// - Otherwise use NEXT_PUBLIC_API_BASE_URL if set
// - Fallback to legacy NEXT_PUBLIC_API_URL if set
// - Finally, fallback to '/api' (same-origin proxy) if nothing provided

export function getApiBase(): string {
  // Browser dev: prefer local backend
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
    return 'http://localhost:3003';
  }

  // In Next.js, NEXT_PUBLIC_* are statically inlined at build time via process.env
  const envBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '') as string;

  const trimmed = envBase.replace(/\/$/, '');
  return trimmed || '/api';
}
