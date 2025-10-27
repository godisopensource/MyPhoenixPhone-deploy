'use client';

import { useDemo } from '../contexts/DemoContext';

interface DemoBannerProps {
  verificationCode?: string | null;
}

export function DemoBanner({ verificationCode }: DemoBannerProps) {
  const { isDemoMode, currentScenario } = useDemo();

  if (!isDemoMode || !currentScenario) {
    return null;
  }

  return (
    <div className="alert alert-warning alert-dismissible fade show mb-0" role="alert">
      <div className="container-xxl">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h6 className="alert-heading mb-2">
              <svg width="20" height="20" fill="currentColor" className="me-2" aria-hidden="true" focusable="false">
                <use xlinkHref="#icon-beaker" />
              </svg>
              Mode Démo Actif - {currentScenario.name}
            </h6>
            <p className="mb-1 small">{currentScenario.description}</p>
            <div className="d-flex align-items-center gap-3 small">
              <div>
                <svg width="14" height="14" fill="currentColor" className="me-1" aria-hidden="true">
                  <use xlinkHref="#icon-phone" />
                </svg>
                <code>{currentScenario.phoneNumber}</code>
              </div>
              {currentScenario.characteristics.deviceModel && (
                <div>
                  <strong>Appareil:</strong> {currentScenario.characteristics.deviceModel}
                </div>
              )}
              {currentScenario.characteristics.estimatedValue && (
                <div>
                  <strong>Valeur:</strong> {currentScenario.characteristics.estimatedValue}€
                </div>
              )}
            </div>
            
            {/* Verification code display */}
            {verificationCode && (
              <div className="mt-3 p-3 bg-white border border-dark rounded">
                <div className="d-flex align-items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg width="24" height="24" fill="currentColor" aria-hidden="true">
                      <use xlinkHref="#icon-lock" />
                    </svg>
                  </div>
                  <div className="flex-grow-1">
                    <div className="small text-muted mb-1">Code de vérification</div>
                    <div 
                      className="fw-bold text-dark"
                      style={{
                        fontSize: '1.5rem',
                        fontFamily: 'monospace',
                        letterSpacing: '0.3em'
                      }}
                    >
                      {verificationCode}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(verificationCode);
                      }}
                      title="Copier le code"
                    >
                      <svg width="16" height="16" fill="currentColor" aria-hidden="true">
                        <use xlinkHref="#icon-copy" />
                      </svg>
                      <span className="ms-1">Copier</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="col-md-4 text-md-end mt-3 mt-md-0">
            <div className="d-flex flex-wrap gap-1 justify-content-md-end">
              {currentScenario.tags.map(tag => (
                <span key={tag} className="badge bg-secondary small">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* SVG icons if not already defined */}
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
        <symbol id="icon-beaker" viewBox="0 0 16 16">
          <path d="M5.5 1a.5.5 0 0 0 0 1h.5v1.5a2.5 2.5 0 0 0 .5 1.5l3.5 4.5a2.5 2.5 0 0 1 .5 1.5V14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 1 .5-1.5l3.5-4.5a2.5 2.5 0 0 0 .5-1.5V2h.5a.5.5 0 0 0 0-1h-4z"/>
        </symbol>
        <symbol id="icon-phone" viewBox="0 0 16 16">
          <path d="M11 1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
          <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </symbol>
        <symbol id="icon-lock" viewBox="0 0 16 16">
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        </symbol>
        <symbol id="icon-copy" viewBox="0 0 16 16">
          <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6ZM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"/>
        </symbol>
      </svg>
    </div>
  );
}
