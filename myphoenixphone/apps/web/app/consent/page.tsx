"use client";
import { useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function ConsentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConsent() {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = (typeof window !== 'undefined' && window.location.origin.includes('localhost'))
        ? 'http://localhost:3003'
        : (process.env.NEXT_PUBLIC_API_URL || '/api');
      const res = await fetch(`${apiUrl}/consents/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.status === 302 || res.status === 200) {
        const data = await res.json().catch(() => null);
        if (data?.redirect) {
          window.location.href = data.redirect;
          return;
        }
      }
      // Fallback: open docs or show message
      setError("Unable to start OAuth flow. Check backend logs.");
    } catch (e) {
      setError("Network error starting consent flow.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <div className="container-xxl py-5 bg-white">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h1 className="h4">Authorize access</h1>
              <p className="text-muted">We will request permission to verify your phone number.</p>
              <ul>
                <li>Read basic profile</li>
                <li>Access phone number</li>
              </ul>

              {error && <div className="alert alert-danger">{error}</div>}

              <button className="btn btn-primary" onClick={startConsent} disabled={loading}>
                {loading ? "Starting…" : "Sign in with Orange"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
