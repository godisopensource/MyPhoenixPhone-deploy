'use client';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function ConsentCheckbox({ checked, onChange }: Props) {
  return (
    <div className="card border-primary">
      <div className="card-body">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="consent"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="consent">
            <strong>J'accepte</strong> que Orange utilise les informations fournies pour calculer une estimation de reprise. 
            Ces données seront traitées conformément à la{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              politique de confidentialité
            </a>
            {' '}d'Orange.
          </label>
        </div>

        <div className="mt-3">
          <h6 className="fw-bold">Vos données sont protégées</h6>
          <ul className="small text-muted">
            <li>Aucune donnée personnelle n'est collectée sans votre consentement</li>
            <li>Vos informations ne sont jamais partagées avec des tiers</li>
            <li>Vous pouvez retirer votre consentement à tout moment</li>
            <li>Toutes les données sont stockées de manière sécurisée en conformité RGPD</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
