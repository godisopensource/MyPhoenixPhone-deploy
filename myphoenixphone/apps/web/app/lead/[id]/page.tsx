'use client';

import { useState } from 'react';
import ModelSelector from './components/ModelSelector';
import ConditionForm from './components/ConditionForm';
import ConsentCheckbox from './components/ConsentCheckbox';
import EstimateDisplay from './components/EstimateDisplay';

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

export default function LeadPage({ params }: { params: { id: string } }) {
  const [step, setStep] = useState(1);
  const [selectedPhone, setSelectedPhone] = useState<PhoneModel | null>(null);
  const [condition, setCondition] = useState<DeviceCondition | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [estimate, setEstimate] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadId = params.id;

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
      // Determine API URL based on environment
      // When running with Turbo, backend is on port 3000, frontend on 3001
      // Determine API URL based on environment
  // Backend runs on port 3003 in Turbo dev environment
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      
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
        throw new Error('Failed to get estimate');
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
    <main className="container py-5">
      {/* Hero Section */}
      <div className="text-center mb-5">
        <h1 className="display-4 mb-3">Valorisez votre ancien téléphone</h1>
        <p className="lead text-muted">
          Découvrez instantanément la valeur de reprise de votre appareil Orange
        </p>
        <p className="text-muted">Lead ID: {leadId}</p>
      </div>

      {/* Progress Indicator */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="d-flex justify-content-between">
            <div className={`text-center ${step >= 1 ? 'text-primary' : 'text-muted'}`}>
              <div className="mb-2">
                <span className="badge bg-primary rounded-circle">1</span>
              </div>
              <small>Modèle</small>
            </div>
            <div className={`text-center ${step >= 2 ? 'text-primary' : 'text-muted'}`}>
              <div className="mb-2">
                <span className="badge bg-primary rounded-circle">2</span>
              </div>
              <small>État</small>
            </div>
            <div className={`text-center ${step >= 3 ? 'text-primary' : 'text-muted'}`}>
              <div className="mb-2">
                <span className="badge bg-primary rounded-circle">3</span>
              </div>
              <small>Consentement</small>
            </div>
            <div className={`text-center ${step >= 4 ? 'text-primary' : 'text-muted'}`}>
              <div className="mb-2">
                <span className="badge bg-primary rounded-circle">4</span>
              </div>
              <small>Estimation</small>
            </div>
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
        <ModelSelector onSelect={handlePhoneSelect} />
      )}

      {/* Step 2: Condition Assessment */}
      {step === 2 && selectedPhone && (
        <div>
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">Appareil sélectionné</h5>
              <p className="card-text">
                {selectedPhone.brand} {selectedPhone.model} {selectedPhone.storage}
              </p>
              <button className="btn btn-link" onClick={() => setStep(1)}>
                Changer
              </button>
            </div>
          </div>
          <ConditionForm
            onSubmit={handleConditionSubmit}
            onBack={() => setStep(1)}
          />
        </div>
      )}

      {/* Step 3: Consent & Estimate Request */}
      {step === 3 && condition && (
        <div>
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">Récapitulatif</h5>
              <p><strong>Appareil:</strong> {selectedPhone?.brand} {selectedPhone?.model}</p>
              <p><strong>Écran:</strong> {condition.screen}</p>
              <p><strong>Batterie:</strong> {condition.battery}</p>
              <p><strong>Dommages:</strong> {condition.damage.length > 0 ? condition.damage.join(', ') : 'Aucun'}</p>
              <p><strong>Déverrouillé:</strong> {condition.unlocked ? 'Oui' : 'Non'}</p>
              <button className="btn btn-link" onClick={() => setStep(2)}>
                Modifier
              </button>
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
            >
              {loading ? 'Calcul en cours...' : 'Obtenir mon estimation'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Estimate Display */}
      {step === 4 && estimate && (
        <EstimateDisplay
          estimate={estimate}
          phone={selectedPhone}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
