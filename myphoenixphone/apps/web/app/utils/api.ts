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

  // Access env in a way that doesn't require Node types in the browser
  const env = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) as
    | Record<string, string>
    | undefined;
  const envBase = (env?.NEXT_PUBLIC_API_BASE_URL || env?.NEXT_PUBLIC_API_URL || '') as string;

  const trimmed = envBase.replace(/\/$/, '');
  return trimmed || '/api';
}
