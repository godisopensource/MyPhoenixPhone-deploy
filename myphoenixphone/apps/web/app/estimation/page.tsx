'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBase } from '../utils/api';
import { useDemoData } from '../hooks/useDemoData';
import { DemoBanner } from '../components/DemoBanner';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import ModelSelector from '../lead/[id]/components/ModelSelector';
import ConditionForm from '../lead/[id]/components/ConditionForm';
import ConsentCheckbox from '../lead/[id]/components/ConsentCheckbox';
import EstimateDisplay from '../lead/[id]/components/EstimateDisplay';
import { InfoIcon, CheckCircleIcon, CheckIcon, WarningIcon, CrossIcon, BatteryIcon, LockIcon, UnlockIcon, BoxIcon } from '../components/solaris-icons';

interface DeviceCondition {
  screen: 'perfect' | 'scratches' | 'broken';
  battery: 'excellent' | 'good' | 'fair';
  damage: string[];
  unlocked: boolean;
  accessories: boolean;
}

interface PhoneModel {
  id: string;
  brand: string;
  model: string;
  storage?: string;
}

export default function EstimationPage() {
  const { isDemoMode, phoneNumber: demoPhoneNumber } = useDemoData();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPhone, setSelectedPhone] = useState<PhoneModel | null>(null);
  const [condition, setCondition] = useState<DeviceCondition | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [estimate, setEstimate] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId] = useState<string>('demo-lead');

  // Pre-fill demo data when entering demo mode
  useEffect(() => {
    if (isDemoMode && !selectedPhone) {
      // Pre-select iPhone 13 Pro Max 256GB in excellent condition
      // Use a model that exists in the backend catalog to avoid 404s
      const demoPhone: PhoneModel = {
        id: 'demo-iphone-14-pro-128',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        storage: '128GB',
      };
      setSelectedPhone(demoPhone);
      
      const demoCondition: DeviceCondition = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: true,
        accessories: true
      };
      setCondition(demoCondition);
      
      // Skip to consent step
      setStep(3);
      setHasConsent(false); // User still needs to accept
    }
  }, [isDemoMode, selectedPhone]);

  const handlePhoneSelect = (phone: PhoneModel) => {
    setSelectedPhone(phone);
    setStep(2);
  };

  const handleConditionSubmit = (cond: DeviceCondition) => {
    setCondition(cond);
    setStep(3);
  };

  const handleConsentChange = (consent: boolean) => {
    setHasConsent(consent);
  };

  const handleGetEstimate = async () => {
    if (!selectedPhone || !condition || !hasConsent) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = getApiBase();
      
  const response = await fetch(`${apiUrl}/pricing/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedPhone.model,
          manufacturer: selectedPhone.brand,
          storage: selectedPhone.storage,
          condition,
        }),
      });

      if (!response.ok) {
        // Provide a clearer message when the model isn't found in catalog
        if (response.status === 404) {
          throw new Error(
            "Modèle non reconnu par l'estimateur. Sélectionnez un modèle proche dans la liste (ex: iPhone 14 Pro 128GB), puis réessayez."
          );
        }
        const details = await response.text().catch(() => '');
        throw new Error(`Échec de l'estimation (HTTP ${response.status}). ${details}`.trim());
      }

      const data = await response.json();
      setEstimate(data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedPhone(null);
    setCondition(null);
    setHasConsent(false);
    setEstimate(null);
    setError(null);
  };

  return (
    <>
      <DemoBanner />
      <Header />

      <main className="container py-5 bg-white">
        {/* Hero Section */}
        <div className="text-center mb-5">
          <h1 className="display-5 fw-bold mb-3" style={{ color: '#ff7900' }}>
            Valorisez votre ancien téléphone
          </h1>
          <p className="lead text-muted mb-2">
            Découvrez instantanément la valeur de reprise de votre appareil
          </p>
          <div className="d-inline-flex align-items-center gap-2 text-muted">
            <InfoIcon className="me-2" />
            <small>Estimation gratuite et sans engagement</small>
          </div>
        </div>

        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <div className="row justify-content-center mb-4">
            <div className="col-lg-8">
              <div className="alert alert-warning d-flex align-items-start" role="alert">
                <i className="bi bi-info-circle-fill me-3 mt-1" style={{ fontSize: '1.25rem', color: '#ff7900' }}></i>
                <div>
                  <h6 className="alert-heading mb-2">Mode Démonstration Actif</h6>
                  <p className="mb-0 small">
                    Ce scénario pré-remplit un <strong>iPhone 13 Pro Max 256GB en excellent état</strong>. 
                    Vous pouvez modifier le modèle et l'état, ou accepter le consentement pour voir l'estimation de reprise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="row justify-content-center mb-5">
          <div className="col-lg-8">
            <div className="d-flex justify-content-between align-items-center position-relative">
              {/* Progress line */}
              <div className="position-absolute top-50 start-0 w-100" style={{ height: '2px', background: '#e0e0e0', zIndex: 0, marginTop: '16px' }}>
                <div 
                  className="h-100 bg-primary transition-all" 
                  style={{ width: `${((step - 1) / 3) * 100}%`, transition: 'width 0.3s ease' }}
                />
              </div>
              
              {/* Step indicators */}
              {[
                { num: 1, label: 'Modèle' },
                { num: 2, label: 'État' },
                { num: 3, label: 'Consentement' },
                { num: 4, label: 'Estimation' },
              ].map(({ num, label }) => (
                <div key={num} className="text-center position-relative" style={{ zIndex: 1 }}>
                  <div className="mb-2">
                    <span 
                      className={`d-inline-flex align-items-center justify-content-center rounded-circle ${
                        step >= num ? 'bg-primary text-white' : 'bg-white text-muted border border-2'
                      }`}
                      style={{ width: '40px', height: '40px', fontWeight: 'bold' }}
                    >
                      {step > num ? (
                        <CheckCircleIcon width={18} height={18} />
                      ) : (
                        num
                      )}
                    </span>
                  </div>
                  <small className={step >= num ? 'text-primary fw-semibold' : 'text-muted'}>
                    {label}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {/* Step 1: Model Selection */}
        {step === 1 && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <ModelSelector onSelect={handlePhoneSelect} />
            </div>
          </div>
        )}

        {/* Step 2: Condition Assessment */}
        {step === 2 && selectedPhone && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                <InfoIcon className="me-2" />
                <div>
                  <strong>{selectedPhone.brand} {selectedPhone.model}</strong>
                  {selectedPhone.storage && <span className="ms-2 badge bg-secondary">{selectedPhone.storage}</span>}
                  <button className="btn btn-link btn-sm p-0 ms-3 text-decoration-none" onClick={() => setStep(1)}>
                    Modifier
                  </button>
                </div>
              </div>
              <ConditionForm
                onSubmit={handleConditionSubmit}
                onBack={() => setStep(1)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Consent & Estimate Request */}
        {step === 3 && condition && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card mb-4 border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">Récapitulatif de votre appareil</h5>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setStep(2)}>
                      Modifier
                    </button>
                  </div>
                  <hr />
                  <div className="row g-3">
                    <div className="col-md-6">
                      <small className="text-muted d-block mb-1">Appareil</small>
                      <strong>{selectedPhone?.brand} {selectedPhone?.model}</strong>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted d-block mb-1">État de l'écran</small>
                      <strong>
                        {condition.screen === 'perfect' && (
                          <>
                            <CheckIcon className="me-1" />
                            Parfait
                          </>
                        )}
                        {condition.screen === 'scratches' && (
                          <>
                            <WarningIcon className="me-1" />
                            Rayures
                          </>
                        )}
                        {condition.screen === 'broken' && (
                          <>
                            <CrossIcon className="me-1" />
                            Cassé
                          </>
                        )}
                      </strong>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted d-block mb-1">État de la batterie</small>
                      <strong>
                        {condition.battery === 'excellent' && (
                          <>
                            <BatteryIcon className="me-1" />
                            Excellente (&gt;80%)
                          </>
                        )}
                        {condition.battery === 'good' && 'Bonne (60-80%)'}
                        {condition.battery === 'fair' && 'Moyenne (<60%)'}
                      </strong>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted d-block mb-1">Verrouillage opérateur</small>
                      <strong>{condition.unlocked ? (
                        <><UnlockIcon className="me-1" />Déverrouillé</>
                      ) : (
                        <><LockIcon className="me-1" />Verrouillé</>
                      )}</strong>
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block mb-1">Dommages physiques</small>
                      <strong>
                        {condition.damage.length === 0 ? (
                          <><CheckIcon className="me-1" />Aucun dommage</>
                        ) : condition.damage.join(', ')}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <ConsentCheckbox
                checked={hasConsent}
                onChange={handleConsentChange}
              />

              <div className="d-grid gap-2 mt-4">
                <button
                  className="btn btn-primary btn-lg"
                  disabled={!hasConsent || loading}
                  onClick={handleGetEstimate}
                  style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Calcul en cours...
                    </>
                  ) : (
                    <>
                      <BoxIcon className="me-2" />
                      Obtenir mon estimation gratuite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Estimate Display */}
        {step === 4 && estimate && (
          <EstimateDisplay
            estimate={estimate}
            phone={selectedPhone}
            onReset={handleReset}
            leadId={leadId}
          />
        )}
      </main>

      <Footer />
    </>
  );
}
