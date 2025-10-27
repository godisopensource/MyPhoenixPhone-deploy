'use client';

import { useEffect, useState } from 'react';

interface CodeNotificationProps {
  code: string;
  duration?: number; // milliseconds to show notification
}

/**
 * Floating notification that displays a verification code
 * Appears near the demo mode button and auto-dismisses
 */
export function CodeNotification({ code, duration = 10000 }: CodeNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [code, duration]);

  if (!visible) return null;

  return (
    <div
      className="position-fixed"
      style={{
        bottom: '90px',
        right: '20px',
        zIndex: 1060,
        maxWidth: '300px',
      }}
    >
      <div className="alert alert-info alert-dismissible fade show shadow-lg" role="alert">
        <button
          type="button"
          className="btn-close"
          onClick={() => setVisible(false)}
          aria-label="Close"
        />
        <h5 className="alert-heading">
          <span className="icon-lock me-2" aria-hidden="true" />
          Code de vérification
        </h5>
        <p className="mb-2">Votre code de démonstration :</p>
        <div
          className="text-center p-3 mb-0"
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            letterSpacing: '0.3em',
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '8px',
          }}
        >
          {code}
        </div>
        <small className="text-muted d-block mt-2">
          Ce code s'auto-détruit dans {duration / 1000}s
        </small>
      </div>
    </div>
  );
}
