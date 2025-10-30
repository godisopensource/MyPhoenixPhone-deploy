import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { pageSEO } from '../utils/seo';

export const metadata: Metadata = pageSEO.store;

// Redirect /store to the current lead flow. Accepts ?id=, ?lead=, or ?leadId=. Falls back to demo lead.
export default function StoreRedirectPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const idParam = (searchParams?.id || searchParams?.lead || searchParams?.leadId) as string | string[] | undefined;
  const leadId = Array.isArray(idParam) ? idParam[0] : idParam;
  const targetLeadId = leadId && leadId.trim().length > 0 ? leadId.trim() : 'demo-lead';
  redirect(`/lead/${encodeURIComponent(targetLeadId)}/store`);
}
