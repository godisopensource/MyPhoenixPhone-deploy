"use client";
import { useEffect, useState } from "react";

type Eligibility = {
  eligible: boolean;
  reasons?: string[];
  snapshot?: Record<string, any>;
};

export default function EligibilityResult() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Eligibility | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEligibility() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:3003/eligibility", { credentials: "include" });
        if (res.ok) {
          const body = await res.json();
          setData(body);
        } else if (res.status === 403) {
          setError("Consent required. Please sign in first.");
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
  }, []);

  if (loading) return <div className="container-xxl py-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;

  if (error) return <div className="container-xxl py-5"><div className="alert alert-warning">{error}</div></div>;

  if (!data) return null;

  return (
    <div className="container-xxl py-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className={`card ${data.eligible ? "border-success" : "border-danger"}`}>
            <div className="card-body">
              <h1 className="h4">Eligibility result</h1>
              <p className="lead">{data.eligible ? "Eligible" : "Not eligible"}</p>
              {data.reasons && (
                <ul>
                  {data.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
