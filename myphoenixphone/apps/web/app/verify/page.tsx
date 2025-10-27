"use client";
import { useState, useEffect, useRef } from "react";
import { useDemoData } from "../hooks/useDemoData";
import { DemoBanner } from "../components/DemoBanner";

function validateMsisdn(msisdn: string) {
  return /^\+[1-9]\d{1,14}$/.test(msisdn);
}

export default function VerifyPage() {
  const { isDemoMode, phoneNumber: demoPhoneNumber } = useDemoData();
  const [msisdn, setMsisdn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const SITE_KEY = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY : undefined;

  // Pre-fill phone number when demo mode is active
  useEffect(() => {
    if (isDemoMode && demoPhoneNumber) {
      setMsisdn(demoPhoneNumber);
    }
  }, [isDemoMode, demoPhoneNumber]);

  useEffect(() => {
    if (!SITE_KEY) return;

    // load turnstile script if not already
    const existing = document.querySelector('script[data-turnstile]');
    let script: HTMLScriptElement | null = existing as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-turnstile', '1');
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      try {
        // @ts-ignore - grecaptcha-like global for Turnstile is 'turnstile'
        if (typeof (window as any).turnstile === 'undefined') return;
        if (!widgetRef.current) return;
        setWidgetLoading(false);
        // render widget and capture token via callback
        // @ts-ignore
        const id = (window as any).turnstile.render(widgetRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => {
            tokenRef.current = token;
            setWidgetReady(true);
          },
          // called when Turnstile has an internal error (e.g., domain mismatch)
          'error-callback': (_err: any) => {
            // show a friendly French message for domain issues or other errors
            setError("Domaine non valide. Contactez l'administrateur du site si le problème persiste.");
          },
        });
        widgetIdRef.current = id;
      } catch (e) {
        // ignore render errors
        console.warn('Turnstile render failed', e);
        setError("Le widget de sécurité n'a pas pu être initialisé. Contactez l'administrateur du site.");
        setWidgetLoading(false);
      }
    };

    // try to render now or after script loads
  setWidgetLoading(true);
    if ((window as any).turnstile) {
      setScriptLoaded(true);
      renderWidget();
    } else script?.addEventListener('load', () => { setScriptLoaded(true); renderWidget(); });
    // script load error -> show friendly message
    const handleScriptError = () => {
      console.error('Turnstile script failed to load');
      const msg = "Domaine non valide. Contactez l'administrateur du site si le problème persiste.";
      setError(msg);
      setWidgetLoading(false);
    };
    script?.addEventListener('error', handleScriptError);

    return () => {
      // cleanup
      try {
        if ((window as any).turnstile && widgetIdRef.current != null) {
          // @ts-ignore
          (window as any).turnstile.reset(widgetIdRef.current);
        }
      } catch (e) {}
      // remove listeners
      try { script?.removeEventListener('load', renderWidget); } catch (e) {}
      try { script?.removeEventListener('error', handleScriptError as any); } catch (e) {}
    };
  }, []);

  // Try to obtain a fresh token: reset widget, wait for callback to set tokenRef, with timeout
  async function getCaptchaToken(timeout = 8000): Promise<string | null> {
    if (!SITE_KEY) return null;
    tokenRef.current = null;
    setWidgetReady(false);

    try {
      // reset the widget to force a new challenge if API available
      if ((window as any).turnstile && widgetIdRef.current != null && typeof (window as any).turnstile.reset === 'function') {
        try {
          // @ts-ignore
          (window as any).turnstile.reset(widgetIdRef.current);
        } catch (e) {
          console.warn('turnstile.reset failed', e);
        }
      }

      // Wait for tokenRef to be set by the callback
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (tokenRef.current) return tokenRef.current;
        // yield
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150));
      }
      return null;
    } finally {
      setWidgetReady(Boolean(tokenRef.current));
    }
  }

  async function submit() {
    setError(null);
    if (!validateMsisdn(msisdn)) {
      setError("Enter a valid phone number in E.164 format (e.g. +33612345678)");
      return;
    }
    setLoading(true);
    try {
      // ensure we have a captcha token if site key present
      let captchaToken: string | null = null;
      if (SITE_KEY) {
        // try to use tokenRef if available
        captchaToken = tokenRef.current;
        // if missing, try to execute turnstile to get one (if API supports execute)
        try {
          // @ts-ignore
          if (!captchaToken && (window as any).turnstile && widgetIdRef.current != null && typeof (window as any).turnstile.getResponse === 'function') {
            // some turnstile integrations expose getResponse(widgetId)
            // @ts-ignore
            captchaToken = (window as any).turnstile.getResponse(widgetIdRef.current) || null;
          }
        } catch (e) {
          // ignore
        }
      }

      const payload: any = { phoneNumber: msisdn };
      if (SITE_KEY) {
        if (!captchaToken) {
          // force a fresh token attempt
          const t = await getCaptchaToken();
          captchaToken = t;
        }
        if (!captchaToken) {
          setError("Domaine non valide. Contactez l'administrateur du site si le problème persiste.");
          setLoading(false);
          return;
        }
      }
      if (captchaToken) payload.captchaToken = captchaToken;

      // If we are awaiting a code, include it to verify; otherwise this call requests a code
      if (awaitingCode) payload.code = code;

      const res = await fetch("http://localhost:3003/verify/number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        // If this was the send-code step, backend responds { ok: true, codeSent: true, code?: string }
        if (!awaitingCode && data?.codeSent) {
          setAwaitingCode(true);
          setError(null);
          
          // In demo/playground mode, the backend may return the code
          if (data.code) {
            setVerificationCode(data.code);
            console.log(`Demo verification code: ${data.code}`);
          }
        } else {
          // verification completed - redirect with phone number in query params
          window.location.href = `/eligibility-result?phoneNumber=${encodeURIComponent(msisdn)}`;
        }
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Verification failed");
      }
    } catch (e) {
      setError("Network error when verifying number");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DemoBanner verificationCode={verificationCode} />
      <div className="container-xxl py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h1 className="h4">Verify your number</h1>
              <p className="text-muted">Enter the phone number you want to verify</p>
              <div className="mb-3">
                <label className="form-label">Phone number (E.164)</label>
                <input className="form-control" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="+33612345678" />
              </div>

              <div className="mb-3">
                <div ref={widgetRef}>
                  {widgetLoading && (
                    <div className="d-flex align-items-center gap-2">
                      <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                      <div>Chargement du contrôle de sécurité…</div>
                    </div>
                  )}
                  {!widgetLoading && !widgetReady && !error && (
                    <div className="alert alert-secondary">Le contrôle de sécurité est prêt. Veuillez compléter la vérification.</div>
                  )}
                </div>
                {error && (
                  <div className="mt-2">
                    <div className="alert alert-danger">{error}</div>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={async () => {
                        setError(null);
                        setWidgetLoading(true);
                        // try re-render
                        try {
                          if ((window as any).turnstile && widgetIdRef.current != null && typeof (window as any).turnstile.reset === 'function') {
                            // @ts-ignore
                            (window as any).turnstile.reset(widgetIdRef.current);
                          }
                        } catch (e) {}
                        // wait briefly for widget to re-init
                        await new Promise((r) => setTimeout(r, 600));
                        setWidgetLoading(false);
                      }}
                    >
                      Réessayer le contrôle
                    </button>
                  </div>
                )}
              </div>

              {(!error && !widgetReady && !widgetLoading) && (
                <div className="alert alert-info">Le widget de sécurité peut nécessiter une interaction avant de pouvoir soumettre.</div>
              )}
              {/* diagnostics removed for production */}

              {!awaitingCode ? (
                <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Sending…" : "Send code"}</button>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="form-label">Verification code</label>
                    <input className="form-control" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
                  </div>
                  <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Verifying…" : "Verify code"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
