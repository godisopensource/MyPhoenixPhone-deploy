'use client';

import Link from 'next/link';
import { BoxIcon, ShopIcon, HeartIcon } from '../../../components/solaris-icons';

interface PhoneModel {
  id: string;
  brand: string;
  model: string;
  storage?: string;
}

interface Estimate {
  estimated_value: number;
  tier: string;
  tier_number: number;
  currency: string;
  bonus?: number;
  breakdown?: {
    base_price: number;
    multiplier: number;
    condition_penalties: string[];
  };
  matched_phone?: PhoneModel;
}

interface Props {
  estimate: Estimate;
  phone: PhoneModel | null;
  onReset: () => void;
  leadId?: string;
}

export default function EstimateDisplay({ estimate, phone, onReset, leadId }: Props) {
  const totalValue = estimate.estimated_value + (estimate.bonus || 0);

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card border-success">
          <div className="card-header bg-success text-white text-center">
            <h3 className="mb-0">Votre estimation</h3>
          </div>
          <div className="card-body text-center">
            <div className="display-3 text-success fw-bold mb-3">
              {totalValue} {estimate.currency}
            </div>

            {estimate.bonus && estimate.bonus > 0 && (
              <div className="alert alert-info">
                <strong>Bonus État Parfait:</strong> +{estimate.bonus} EUR
              </div>
            )}

            <p className="lead mb-4">
              {phone?.brand} {phone?.model} {phone?.storage}
            </p>

            <div className="row text-start">
              <div className="col-md-6">
                <h6 className="fw-bold">Catégorie de valeur</h6>
                <p className="text-muted">{estimate.tier} (Tier {estimate.tier_number})</p>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold">Prix de base</h6>
                <p className="text-muted">{estimate.breakdown?.base_price} EUR</p>
              </div>
            </div>

            {estimate.breakdown && estimate.breakdown.condition_penalties.length > 0 && (
              <div className="mt-3">
                <h6 className="fw-bold text-start">Ajustements appliqués</h6>
                <ul className="list-group list-group-flush text-start">
                  {estimate.breakdown.condition_penalties.map((penalty, idx) => (
                    <li key={idx} className="list-group-item small text-muted">
                      {penalty}
                    </li>
                  ))}
                </ul>
                <p className="small text-muted text-start mt-2">
                  Multiplicateur final: {(estimate.breakdown.multiplier * 100).toFixed(0)}%
                </p>
              </div>
            )}

            <div className="alert alert-warning mt-4" role="alert">
              <strong>Attention:</strong> Cette estimation est indicative et peut varier en fonction de l'inspection finale de votre appareil.
            </div>
          </div>
        </div>

        {/* Handover Options */}
        <div className="card mt-4">
          <div className="card-body">
            <h5 className="card-title">Comment souhaitez-vous procéder ?</h5>

            <div className="row mt-3">
              <div className="col-md-4 mb-3">
                <Link
                  href={leadId ? `/lead/${leadId}/ship` : '#'}
                  className="btn btn-outline-primary w-100 h-100 text-decoration-none"
                  style={!leadId ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                >
                    <div className="py-3">
                      <div className="fs-4 mb-2">
                        <BoxIcon width={28} height={28} className="" />
                      </div>
                      <h6>Envoi gratuit</h6>
                      <small className="text-muted">
                        Générer une étiquette Colissimo prépayée
                      </small>
                    </div>
                </Link>
              </div>

              <div className="col-md-4 mb-3">
                <Link
                  href={leadId ? `/lead/${leadId}/store` : '#'}
                  className="btn btn-outline-primary w-100 h-100 text-decoration-none"
                  style={!leadId ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                >
                  <div className="py-3">
                    <div className="fs-4 mb-2">
                      <ShopIcon width={28} height={28} className="" />
                    </div>
                    <h6>En boutique</h6>
                    <small className="text-muted">
                      Générer un code de dépôt
                    </small>
                  </div>
                </Link>
              </div>

              <div className="col-md-4 mb-3">
                <a
                  href="https://emmaus-connect.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary w-100 h-100 text-decoration-none"
                >
                  <div className="py-3">
                    <div className="fs-4 mb-2">
                      <HeartIcon width={28} height={28} className="" />
                    </div>
                    <h6>Don solidaire</h6>
                    <small className="text-muted">
                      Offrir à une association (Emmaüs Connect)
                    </small>
                  </div>
                </a>
              </div>
            </div>

            <div className="text-center mt-3">
              <button className="btn btn-link" onClick={onReset}>
                Faire une nouvelle estimation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
