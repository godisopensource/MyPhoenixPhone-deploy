"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Eligibility = {
  eligible: boolean;
  reasons?: string[];
  snapshot?: {
    simSwap?: {
      swappedAt?: string;
      daysAgo?: number;
    };
    reachability?: {
      reachable: boolean;
      connectivity?: string[];
    };
  };
};

export default function EligibilityResult() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Eligibility | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEligibility() {
      setLoading(true);
      try {
        // Get phone number from URL query params
        const phoneNumber = searchParams.get("phoneNumber");
        
        if (!phoneNumber) {
          setError("Phone number missing. Please start from the verification page.");
          setLoading(false);
          return;
        }

        const res = await fetch(
          `http://localhost:3003/eligibility?phoneNumber=${encodeURIComponent(phoneNumber)}`,
          { credentials: "include" }
        );
        
        if (res.ok) {
          const body = await res.json();
          setData(body);
        } else if (res.status === 401) {
          setError("Consent required. Please verify your number first.");
        } else {
          setError("Unable to fetch eligibility");
        }
      } catch (e) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchEligibility();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-xxl py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-warning" role="alert">
              <h4 className="alert-heading">Erreur</h4>
              <p>{error}</p>
              <hr />
              <p className="mb-0">
                <a href="/verify" className="btn btn-primary">
                  Retour à la vérification
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container-xxl py-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className={`card ${data.eligible ? "border-success" : "border-danger"} mb-4`}>
            <div className="card-header">
              <h1 className="h4 mb-0">Résultat d'éligibilité</h1>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <span className={`badge ${data.eligible ? "bg-success" : "bg-danger"} fs-5`}>
                  {data.eligible ? "✓ Éligible" : "✗ Non éligible"}
                </span>
              </div>

              {data.reasons && data.reasons.length > 0 && (
                <div className="mb-4">
                  <h5 className="card-title">Raisons</h5>
                  <ul className="list-group">
                    {data.reasons.map((reason, i) => (
                      <li key={i} className="list-group-item">
                        {formatReason(reason)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.snapshot && (
                <div>
                  <h5 className="card-title">Détails de la vérification</h5>
                  
                  {data.snapshot.simSwap && (
                    <div className="card mb-3">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">Changement de carte SIM</h6>
                        {data.snapshot.simSwap.swappedAt ? (
                          <div>
                            <p className="mb-1">
                              <strong>Date du dernier changement:</strong>{" "}
                              {new Date(data.snapshot.simSwap.swappedAt).toLocaleString("fr-FR")}
                            </p>
                            <p className="mb-0">
                              <strong>Il y a:</strong> {data.snapshot.simSwap.daysAgo} jour(s)
                            </p>
                          </div>
                        ) : (
                          <p className="mb-0 text-muted">Aucun changement récent détecté</p>
                        )}
                      </div>
                    </div>
                  )}

                  {data.snapshot.reachability && (
                    <div className="card">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">État de joignabilité</h6>
                        <p className="mb-1">
                          <strong>Appareil joignable:</strong>{" "}
                          <span className={data.snapshot.reachability.reachable ? "text-success" : "text-danger"}>
                            {data.snapshot.reachability.reachable ? "Oui" : "Non"}
                          </span>
                        </p>
                        {data.snapshot.reachability.connectivity && data.snapshot.reachability.connectivity.length > 0 && (
                          <p className="mb-0">
                            <strong>Connectivité:</strong>{" "}
                            {data.snapshot.reachability.connectivity.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <a href="/verify" className="btn btn-outline-primary">
                  Nouvelle vérification
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatReason(reason: string): string {
  const translations: Record<string, string> = {
    SIM_SWAP_RECENT: "Changement de carte SIM récent détecté",
    SIM_SWAP_OLD: "Ancien changement de carte SIM",
    SIM_SWAP_UNKNOWN: "Historique de changement de carte SIM inconnu",
    DEVICE_REACHABLE: "Appareil joignable",
    DEVICE_UNREACHABLE: "Appareil non joignable",
    DEVICE_REACHABILITY_UNKNOWN: "État de joignabilité inconnu",
    MEETS_CRITERIA: "Répond aux critères d'éligibilité",
    DOES_NOT_MEET_CRITERIA: "Ne répond pas aux critères d'éligibilité",
  };
  return translations[reason] || reason;
}
