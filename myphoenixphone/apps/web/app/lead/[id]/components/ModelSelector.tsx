'use client';

import { useState, useEffect } from 'react';

interface PhoneModel {
  id: string;
  brand: string;
  model: string;
  storage: string;
  keywords: string[];
  avg_price_tier: number;
}

interface Props {
  onSelect: (phone: PhoneModel) => void;
}

export default function ModelSelector({ onSelect }: Props) {
  const [phones, setPhones] = useState<PhoneModel[]>([]);
  const [search, setSearch] = useState('');
  const [filteredPhones, setFilteredPhones] = useState<PhoneModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load phone models from backend
    const apiUrl = typeof window !== 'undefined' 
      ? (window.location.origin.includes('localhost') ? 'http://localhost:3003' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003')
      : 'http://localhost:3003';
    
    setLoading(true);
    setError(null);
    
    fetch(`${apiUrl}/phone-models`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPhones(data);
          setFilteredPhones(data);
        } else {
          throw new Error('Format de données invalide');
        }
      })
      .catch(err => {
        console.error('Failed to load phone models:', err);
        setError(err.message || 'Impossible de charger les modèles de téléphones');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredPhones(phones);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = phones.filter(phone =>
      phone.brand.toLowerCase().includes(searchLower) ||
      phone.model.toLowerCase().includes(searchLower) ||
      phone.keywords.some(kw => kw.includes(searchLower))
    );
    setFilteredPhones(filtered);
  }, [search, phones]);

  const handleDontKnow = () => {
    // Fallback for users who don't know their model
    // In real implementation, this would redirect to donation flow
    alert('Fonction "Je ne sais pas" - redirection vers le don (à implémenter)');
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title mb-4">Quel est votre modèle de téléphone ?</h3>

        <div className="mb-4">
          <label htmlFor="search" className="form-label">
            Rechercher votre modèle
          </label>
          <input
            type="text"
            className="form-control form-control-lg"
            id="search"
            placeholder="Ex: iPhone 13, Galaxy S23, Pixel 8..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <small className="form-text text-muted">
            Tapez le nom de votre téléphone pour filtrer les résultats
          </small>
        </div>

        <div className="list-group mb-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {loading ? (
            <div className="alert alert-info">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              Chargement des modèles de téléphones...
            </div>
          ) : error ? (
            <div className="alert alert-danger">
              <strong>Erreur:</strong> {error}
              <br />
              <small>Vérifiez que le backend est démarré sur le port 3003</small>
            </div>
          ) : filteredPhones.length === 0 ? (
            <div className="alert alert-info">
              Aucun modèle trouvé. Essayez une autre recherche ou cliquez sur "Je ne sais pas".
            </div>
          ) : (
            filteredPhones.map(phone => (
              <button
                key={phone.id}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => onSelect(phone)}
              >
                <div>
                  <div className="fw-bold">{phone.brand} {phone.model}</div>
                  <small className="text-muted">{phone.storage}</small>
                </div>
                <span className="badge bg-primary rounded-pill">
                  Tier {phone.avg_price_tier}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="d-grid">
          <button className="btn btn-outline-secondary" onClick={handleDontKnow}>
            Je ne connais pas mon modèle
          </button>
        </div>

        <div className="alert alert-info mt-3" role="alert">
          <strong>Astuce:</strong> Vous pouvez trouver votre modèle en consultant vos paramètres ou en regardant au dos de votre téléphone.
        </div>
      </div>
    </div>
  );
}
