"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DepositCode {
  code: string;
  qr_code_url?: string;
  qr_code_svg?: string;
  expires_at: string;
}

export default function StorePage({}: {}) {
  const { id } = require('next/navigation').useParams() as { id: string | string[] };
  const leadId = Array.isArray(id) ? id[0] : (id || '');
  const [loading, setLoading] = useState(false);
  const [depositCode, setDepositCode] = useState<DepositCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoVerified, setGeoVerified] = useState<boolean | null>(null);

  // no-op: leadId comes from useParams

  const generate = async () => {
    setLoading(true);
    setError(null);
    setGeoVerified(null);
    setDepositCode(null);

    try {
      const apiUrl = typeof window !== 'undefined'
        ? (window.location.origin.includes('localhost') ? 'http://localhost:3003' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003')
        : 'http://localhost:3003';
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Géolocalisation non disponible'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch (e) {
        // ignore
      }

      const res = await fetch(`${apiUrl}/handover/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, latitude: lat, longitude: lon }),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || 'Erreur génération');
      const body = JSON.parse(txt || '{}');
      setDepositCode(body.data || null);
      setGeoVerified(typeof body.geofence_verified === 'boolean' ? body.geofence_verified : null);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const downloadQr = () => {
    if (!depositCode?.qr_code_url) return;
    const a = document.createElement('a');
    a.href = depositCode.qr_code_url;
    a.download = `store-${depositCode.code}.png`;
    a.click();
  };

  return (
    <main className="container py-5 bg-white">
      <div className="text-center mb-4">
        <h1 className="h2">
          <i className="bi bi-shop me-2" aria-hidden="true"></i>
          Dépôt en boutique
        </h1>
        <p className="text-muted">Présentez ce QR au conseiller</p>
      </div>

      {error && <div className="alert alert-danger"><strong>Erreur :</strong> {error}</div>}

      {!depositCode ? (
        <section className="mx-auto" style={{ maxWidth: 680 }}>
          <h2 className="h5">Comment procéder</h2>
          <ol className="list-group list-group-numbered">
            <li className="list-group-item">Générez votre code dépôt</li>
            <li className="list-group-item">Présentez le QR ou le code en boutique</li>
            <li className="list-group-item">Remettez le colis au conseiller</li>
          </ol>
          <div className="mt-3 d-grid">
            <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading || !leadId}>
              {loading ? 'Génération…' : 'Générer mon code dépôt'}
            </button>
          </div>
        </section>
      ) : (
        <section className="mx-auto" style={{ maxWidth: 680 }}>
          <div className="alert alert-success" role="alert">
            <i className="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
            Code dépôt généré
          </div>
          <p><strong>Code :</strong> <code className="text-warning" style={{ color: 'inherit' }}>{depositCode.code}</code></p>
          {depositCode.qr_code_url && (
            <img src={depositCode.qr_code_url} alt="QR code" style={{ maxWidth: 260 }} />
          )}
          {depositCode.qr_code_svg && (
            <div dangerouslySetInnerHTML={{ __html: depositCode.qr_code_svg }} />
          )}
          <p className="mt-2 text-muted">Valide jusqu’à expiration</p>
          {geoVerified !== null && (
            <div className="mt-2">
              {geoVerified ? (
                <span className="badge bg-success d-inline-flex align-items-center">
                  <i className="bi bi-check-circle me-1" aria-hidden="true"></i>
                  Point proche
                </span>
              ) : (
                <span className="badge bg-warning d-inline-flex align-items-center">
                  <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                  Vérification impossible
                </span>
              )}
            </div>
          )}
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-primary" onClick={() => window.print()}>
              <i className="bi bi-printer me-2" aria-hidden="true"></i>
              Imprimer
            </button>
            <button className="btn btn-outline-secondary" onClick={downloadQr}>
              <i className="bi bi-download me-2" aria-hidden="true"></i>
              Télécharger QR
            </button>
          </div>
        </section>
      )}

      <div className="text-center mt-4">
        <Link href={`/lead/${leadId}`} className="btn btn-link">
          <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
          Retour
        </Link>
      </div>
    </main>
  );
}