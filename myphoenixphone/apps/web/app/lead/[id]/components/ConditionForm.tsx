'use client';

import { useState } from 'react';
import IMEIHelper from './IMEIHelper';

interface DeviceCondition {
  screen: 'perfect' | 'scratches' | 'broken';
  battery: 'excellent' | 'good' | 'fair';
  damage: string[];
  unlocked: boolean;
  accessories: boolean;
}

interface Props {
  onSubmit: (condition: DeviceCondition) => void;
  onBack: () => void;
}

export default function ConditionForm({ onSubmit, onBack }: Props) {
  const [screen, setScreen] = useState<'perfect' | 'scratches' | 'broken'>('perfect');
  const [battery, setBattery] = useState<'excellent' | 'good' | 'fair'>('excellent');
  const [damage, setDamage] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState(true);
  const [accessories, setAccessories] = useState(true);
  const [showIMEI, setShowIMEI] = useState(false);

  const handleDamageToggle = (dmg: string) => {
    if (damage.includes(dmg)) {
      setDamage(damage.filter(d => d !== dmg));
    } else {
      setDamage([...damage, dmg]);
    }
  };

  const handleSubmit = () => {
    onSubmit({ screen, battery, damage, unlocked, accessories });
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title mb-4">Évaluez l'état de votre appareil</h3>

        {/* Question 1: Screen Condition */}
        <div className="mb-4">
          <label className="form-label fw-bold">1. État de l'écran</label>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="screen"
              id="screen-perfect"
              checked={screen === 'perfect'}
              onChange={() => setScreen('perfect')}
            />
            <label className="form-check-label" htmlFor="screen-perfect">
              Parfait - Aucune rayure, comme neuf
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="screen"
              id="screen-scratches"
              checked={screen === 'scratches'}
              onChange={() => setScreen('scratches')}
            />
            <label className="form-check-label" htmlFor="screen-scratches">
              Rayures légères - Quelques marques d'usure
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="screen"
              id="screen-broken"
              checked={screen === 'broken'}
              onChange={() => setScreen('broken')}
            />
            <label className="form-check-label" htmlFor="screen-broken">
              Cassé - Fissures ou ne fonctionne pas
            </label>
          </div>
        </div>

        {/* Question 2: Battery Health */}
        <div className="mb-4">
          <label className="form-label fw-bold">2. Autonomie de la batterie</label>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="battery"
              id="battery-excellent"
              checked={battery === 'excellent'}
              onChange={() => setBattery('excellent')}
            />
            <label className="form-check-label" htmlFor="battery-excellent">
              Excellente - Tient toute la journée
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="battery"
              id="battery-good"
              checked={battery === 'good'}
              onChange={() => setBattery('good')}
            />
            <label className="form-check-label" htmlFor="battery-good">
              Bonne - Légère perte d'autonomie
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="battery"
              id="battery-fair"
              checked={battery === 'fair'}
              onChange={() => setBattery('fair')}
            />
            <label className="form-check-label" htmlFor="battery-fair">
              Moyenne - Nécessite plusieurs recharges
            </label>
          </div>
        </div>

        {/* Question 3: Physical Damage */}
        <div className="mb-4">
          <label className="form-label fw-bold">3. Dommages physiques (plusieurs choix possibles)</label>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="damage-none"
              checked={damage.length === 0}
              onChange={() => setDamage([])}
            />
            <label className="form-check-label" htmlFor="damage-none">
              Aucun dommage
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="damage-dents"
              checked={damage.includes('dents')}
              onChange={() => handleDamageToggle('dents')}
            />
            <label className="form-check-label" htmlFor="damage-dents">
              Bosses ou coups
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="damage-scratches"
              checked={damage.includes('scratches')}
              onChange={() => handleDamageToggle('scratches')}
            />
            <label className="form-check-label" htmlFor="damage-scratches">
              Rayures sur le boîtier
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="damage-water"
              checked={damage.includes('water')}
              onChange={() => handleDamageToggle('water')}
            />
            <label className="form-check-label" htmlFor="damage-water">
              Dégât des eaux
            </label>
          </div>
        </div>

        {/* Question 4: Carrier Unlock */}
        <div className="mb-4">
          <label className="form-label fw-bold">4. Votre téléphone est-il déverrouillé ?</label>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="unlocked"
              checked={unlocked}
              onChange={(e) => setUnlocked(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="unlocked">
              {unlocked ? 'Déverrouillé (fonctionne avec toutes les cartes SIM)' : 'Verrouillé opérateur'}
            </label>
          </div>
          <button
            type="button"
            className="btn btn-link btn-sm"
            onClick={() => setShowIMEI(true)}
          >
            Comment vérifier le déverrouillage ?
          </button>
        </div>

        {/* Question 5: Accessories */}
        <div className="mb-4">
          <label className="form-label fw-bold">5. Possédez-vous les accessoires d'origine ?</label>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="accessories"
              checked={accessories}
              onChange={(e) => setAccessories(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="accessories">
              {accessories ? 'Oui (chargeur, boîte, etc.)' : 'Non'}
            </label>
          </div>
          <small className="form-text text-muted">
            Les accessoires peuvent augmenter la valeur de reprise
          </small>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2 mt-4">
          <button className="btn btn-secondary" onClick={onBack}>
            Retour
          </button>
          <button className="btn btn-primary flex-grow-1" onClick={handleSubmit}>
            Continuer
          </button>
        </div>
      </div>

      {/* IMEI Helper Modal */}
      {showIMEI && <IMEIHelper onClose={() => setShowIMEI(false)} />}
    </div>
  );
}
