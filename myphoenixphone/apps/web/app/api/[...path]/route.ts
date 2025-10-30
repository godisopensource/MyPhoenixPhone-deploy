import { NextResponse } from 'next/server';

// Server-side proxy to the backend API to avoid CORS and client env drift.
// Configure the backend origin on the frontend service as BACKEND_BASE_URL.
// Fallbacks:
// - Use NEXT_PUBLIC_API_BASE_URL if provided (for convenience)
// - In dev, default to http://localhost:3003

function getBackendBase(): string {
  const base =
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    '';
  if (base) return base.replace(/\/$/, '');
  return 'http://localhost:3003';
}

async function proxy(req: Request, pathParams: string[]) {
  const backend = getBackendBase();
  const pathSegs = pathParams || [];
  const url = new URL(req.url);
  const targetUrl = `${backend}/${pathSegs.join('/')}${url.search}`;

  console.log(`[Proxy] ${req.method} ${url.pathname} → ${targetUrl}`);
  console.log(`[Proxy] BACKEND_BASE_URL=${process.env.BACKEND_BASE_URL}`);
  console.log(`[Proxy] NEXT_PUBLIC_API_BASE_URL=${process.env.NEXT_PUBLIC_API_BASE_URL}`);

  // Clone request body if present
  const method = req.method || 'GET';
  const headers = new Headers(req.headers);

  // Remove hop-by-hop headers and host-related headers
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('connection');
  headers.delete('accept-encoding');

  const init: RequestInit = {
    method,
    headers,
    // For methods with body
    body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      ? await req.arrayBuffer()
      : undefined,
    // Keep default credentials (no cookies forwarded cross-origin)
    redirect: 'manual',
  };

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (e) {
    const err = e as Error;
    console.error(`[Proxy] Network error: ${err.message}`, err);
    // Network error to backend
    return NextResponse.json(
      {
        ok: false,
        message: 'Proxy network error to backend',
        detail: err?.message || String(e),
        target: targetUrl,
        backend,
      },
      { status: 502 },
    );
  }

  // Build downstream response
  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete('content-encoding');
  respHeaders.delete('transfer-encoding');
  respHeaders.delete('content-length');

  const body = upstream.body;
  return new NextResponse(body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

function getPathSegmentsFromRequest(req: Request): string[] {
  const pathname = new URL(req.url).pathname; // e.g. /api/phone-models
  const apiPrefix = '/api/';
  let rest = '';
  if (pathname === '/api' || pathname === '/api/') {
    rest = '';
  } else if (pathname.startsWith(apiPrefix)) {
    rest = pathname.slice(apiPrefix.length);
  } else {
    rest = pathname.replace(/^\/+/, '');
  }

  if (!rest) return [];
  return rest.split('/').map((s) => decodeURIComponent(s));
}

export async function GET(req: Request) {
  return proxy(req, getPathSegmentsFromRequest(req));
}
export async function POST(req: Request) {
  return proxy(req, getPathSegmentsFromRequest(req));
}
export async function PUT(req: Request) {
  return proxy(req, getPathSegmentsFromRequest(req));
}
export async function PATCH(req: Request) {
  return proxy(req, getPathSegmentsFromRequest(req));
}
export async function DELETE(req: Request) {
  return proxy(req, getPathSegmentsFromRequest(req));
}
export async function OPTIONS(_req: Request) {
  // Minimal preflight response (same-origin usually doesn't preflight)
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
