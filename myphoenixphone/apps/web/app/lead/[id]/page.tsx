'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @deprecated Cette route est dépréciée. Utiliser /estimation à la place.
 * Cette page redirige automatiquement vers /estimation pour une meilleure cohérence.
 */
export default function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  useEffect(() => {
    // Redirection automatique vers la nouvelle route /estimation
    router.replace('/estimation');
  }, [router]);

  return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Redirection en cours...</span>
      </div>
      <p className="mt-3 text-muted">Redirection vers la nouvelle page d'estimation...</p>
    </div>
  );
}
