import { NextRequest, NextResponse } from 'next/server';

// Redirect /ship to /lead/{leadId}/ship
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const idParam = sp.get('id') || sp.get('lead') || sp.get('leadId') || 'demo-lead';
  const leadId = (idParam || '').trim() || 'demo-lead';
  const target = new URL(`/lead/${encodeURIComponent(leadId)}/ship`, url);
  return NextResponse.redirect(target, 308);
}
