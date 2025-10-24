'use client';

import { useEffect, useState } from 'react';

interface Lead {
  id: string;
  msisdn_masked: string;
  dormant_score: number;
  eligible: boolean;
  device_tier?: string;
  last_contact_at?: string;
  contact_count: number;
  converted: boolean;
  converted_at?: string;
  created_at: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('score-desc');
  const [pagination, setPagination] = useState({ page: 1, total: 0, perPage: 50 });

  useEffect(() => {
    fetchLeads();
  }, [filterStatus, filterTier, searchTerm, sortBy, pagination.page]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const params = new URLSearchParams();

      // Build query parameters
      if (filterStatus !== 'all') {
        if (filterStatus === 'dormant') {
          params.append('eligible', 'true');
        } else if (filterStatus === 'converted') {
          params.append('converted', 'true');
        } else if (filterStatus === 'contacted') {
          params.append('eligible', 'false');
        }
      }

      if (filterTier !== 'all') {
        params.append('device_tier', filterTier);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.perPage));
      params.append('sort', sortBy);

      const response = await fetch(`${apiUrl}/dormant/leads?${params.toString()}`);
      const data = await response.json();
      setLeads(data.leads || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return { bg: 'danger', label: 'Très chaud' };
    if (score >= 0.6) return { bg: 'warning', label: 'Chaud' };
    if (score >= 0.4) return { bg: 'info', label: 'Tiède' };
    return { bg: 'secondary', label: 'Froid' };
  };

  const getTierBadge = (tier?: string) => {
    const tiers = {
      'flagship': { bg: 'success', label: 'Haut de gamme' },
      'mid-range': { bg: 'info', label: 'Milieu de gamme' },
      'budget': { bg: 'secondary', label: 'Entrée de gamme' },
    };
    const tierInfo = tiers[tier as keyof typeof tiers];
    return tierInfo ? { bg: tierInfo.bg, label: tierInfo.label } : null;
  };

  const totalPages = Math.ceil(pagination.total / pagination.perPage);

  return (
    <div>
      <div className="mb-4">
        <div>
          <h2 className="mb-1">Gestion des Leads</h2>
          <p className="text-muted mb-0">
            {pagination.total} leads · Potentiel de valorisation
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            {/* Search */}
            <div className="col-md-4">
              <label className="form-label small text-muted">Rechercher</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.003-.003.007-.007.01-.01l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.01-.01zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Numéro de téléphone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-md-3">
              <label className="form-label small text-muted">Statut</label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <option value="all">Tous</option>
                <option value="dormant">Dormants</option>
                <option value="contacted">Contactés</option>
                <option value="converted">Convertis</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div className="col-md-3">
              <label className="form-label small text-muted">Segment appareil</label>
              <select
                className="form-select form-select-sm"
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <option value="all">Tous</option>
                <option value="flagship">Haut de gamme</option>
                <option value="mid-range">Milieu de gamme</option>
                <option value="budget">Entrée de gamme</option>
              </select>
            </div>

            {/* Sort */}
            <div className="col-md-2">
              <label className="form-label small text-muted">Trier par</label>
              <select
                className="form-select form-select-sm"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <option value="score-desc">Score (desc)</option>
                <option value="score-asc">Score (asc)</option>
                <option value="recent">Récent</option>
                <option value="oldest">Plus ancien</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small mb-1">Total Leads</div>
              <div className="h3 mb-0" style={{ color: '#ff7900' }}>
                {pagination.total.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small mb-1">Score moyen</div>
              <div className="h3 mb-0">
                {leads.length > 0 
                  ? (leads.reduce((sum, l) => sum + l.dormant_score, 0) / leads.length).toFixed(2)
                  : '0.00'
                }
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small mb-1">Contactés</div>
              <div className="h3 mb-0">
                {leads.filter(l => l.contact_count > 0).length}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small mb-1">Convertis</div>
              <div className="h3 mb-0" style={{ color: '#ff7900' }}>
                {leads.filter(l => l.converted).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <svg width="64" height="64" fill="#dee2e6" viewBox="0 0 16 16" className="mb-3">
              <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
            <h5 className="text-muted">Aucun lead trouvé</h5>
            <p className="text-muted">
              Aucun lead ne correspond à vos critères de recherche
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Numéro</th>
                    <th>Score dormance</th>
                    <th>Segment</th>
                    <th>Statut</th>
                    <th className="text-end">Contacts</th>
                    <th>Dernier contact</th>
                    <th>Conversion</th>
                    <th>Date d'ajout</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const scoreBadge = getScoreBadge(lead.dormant_score);
                    const tierBadge = getTierBadge(lead.device_tier);

                    return (
                      <tr key={lead.id}>
                        <td>
                          <code className="text-monospace">{lead.msisdn_masked}</code>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="progress"
                              style={{ width: '60px', height: '6px' }}
                            >
                              <div
                                className={`progress-bar bg-${scoreBadge.bg}`}
                                role="progressbar"
                                style={{
                                  width: `${lead.dormant_score * 100}%`,
                                }}
                              />
                            </div>
                            <small className="text-muted">
                              {(lead.dormant_score * 100).toFixed(0)}%
                            </small>
                          </div>
                        </td>
                        <td>
                          {tierBadge ? (
                            <span className={`badge bg-${tierBadge.bg}`}>
                              {tierBadge.label}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {lead.converted ? (
                            <span className="badge bg-success">Converti</span>
                          ) : lead.contact_count > 0 ? (
                            <span className="badge bg-warning">Contacté</span>
                          ) : lead.eligible ? (
                            <span className="badge bg-info">Dormant</span>
                          ) : (
                            <span className="badge bg-secondary">Inactif</span>
                          )}
                        </td>
                        <td className="text-end">
                          <strong>{lead.contact_count}</strong>
                        </td>
                        <td>
                          <small className="text-muted">
                            {lead.last_contact_at
                              ? new Date(lead.last_contact_at).toLocaleDateString('fr-FR')
                              : '-'}
                          </small>
                        </td>
                        <td>
                          {lead.converted ? (
                            <small className="text-success">
                              {lead.converted_at
                                ? new Date(lead.converted_at).toLocaleDateString('fr-FR')
                                : '-'}
                            </small>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">
                            {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                          </small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination">
                  <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() =>
                        setPagination(prev => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Précédent
                    </button>
                  </li>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      page =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= pagination.page - 1 && page <= pagination.page + 1)
                    )
                    .map((page, idx, arr) => (
                      <li key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="page-link">...</span>
                        )}
                        <button
                          className={`page-link ${
                            page === pagination.page ? 'active' : ''
                          }`}
                          onClick={() =>
                            setPagination(prev => ({ ...prev, page }))
                          }
                          style={
                            page === pagination.page
                              ? { backgroundColor: '#ff7900', borderColor: '#ff7900' }
                              : {}
                          }
                        >
                          {page}
                        </button>
                      </li>
                    ))}

                  <li
                    className={`page-item ${
                      pagination.page === totalPages ? 'disabled' : ''
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        setPagination(prev => ({
                          ...prev,
                          page: Math.min(totalPages, prev.page + 1),
                        }))
                      }
                      disabled={pagination.page === totalPages}
                    >
                      Suivant
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}
