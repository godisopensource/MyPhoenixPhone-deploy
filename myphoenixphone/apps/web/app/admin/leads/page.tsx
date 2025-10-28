'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDemo } from '../../contexts/DemoContext';
import { AdminDemoGuide } from '../../components/AdminDemoGuide';
import { SearchIcon, UsersIcon } from '../../components/solaris-icons';

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
  const pathname = usePathname();
  const { isDemoMode } = useDemo();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('score-desc');
  const [pagination, setPagination] = useState({ page: 1, total: 0, perPage: 50 });

  useEffect(() => {
    if (isDemoMode) {
      // Build a stable set of demo leads and apply filters/sorts client-side
      const base: Lead[] = [
        {
          id: 'lead_demo_01',
          msisdn_masked: '+33 6 ** ** 10 01',
          dormant_score: 0.92,
          eligible: true,
          device_tier: 'flagship',
          last_contact_at: undefined,
          contact_count: 0,
          converted: false,
          created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_02',
          msisdn_masked: '+33 6 ** ** 10 02',
          dormant_score: 0.68,
          eligible: true,
          device_tier: 'mid-range',
          last_contact_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          contact_count: 1,
          converted: false,
          created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_03',
          msisdn_masked: '+33 6 ** ** 10 03',
          dormant_score: 0.81,
          eligible: true,
          device_tier: 'flagship',
          last_contact_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          contact_count: 2,
          converted: true,
          converted_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_04',
          msisdn_masked: '+33 6 ** ** 10 04',
          dormant_score: 0.35,
          eligible: false,
          device_tier: 'budget',
          last_contact_at: undefined,
          contact_count: 0,
          converted: false,
          created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_05',
          msisdn_masked: '+33 6 ** ** 10 05',
          dormant_score: 0.57,
          eligible: false,
          device_tier: 'mid-range',
          last_contact_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          contact_count: 1,
          converted: false,
          created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_06',
          msisdn_masked: '+33 6 ** ** 10 06',
          dormant_score: 0.23,
          eligible: false,
          device_tier: 'budget',
          last_contact_at: undefined,
          contact_count: 0,
          converted: false,
          created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_07',
          msisdn_masked: '+33 6 ** ** 10 07',
          dormant_score: 0.74,
          eligible: true,
          device_tier: 'mid-range',
          last_contact_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
          contact_count: 3,
          converted: false,
          created_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'lead_demo_08',
          msisdn_masked: '+33 6 ** ** 10 08',
          dormant_score: 0.88,
          eligible: true,
          device_tier: 'flagship',
          last_contact_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
          contact_count: 1,
          converted: false,
          created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
        },
      ];

      // Filters
      let filtered = base;
      if (filterStatus !== 'all') {
        if (filterStatus === 'dormant') filtered = filtered.filter(l => l.eligible && !l.converted);
        if (filterStatus === 'converted') filtered = filtered.filter(l => l.converted);
        if (filterStatus === 'contacted') filtered = filtered.filter(l => l.contact_count > 0 && !l.converted);
      }
      if (filterTier !== 'all') filtered = filtered.filter(l => l.device_tier === filterTier);
      if (searchTerm) filtered = filtered.filter(l => l.msisdn_masked.includes(searchTerm));

      // Sort
      const sorters: Record<string, (a: Lead, b: Lead) => number> = {
        'score-desc': (a, b) => b.dormant_score - a.dormant_score,
        'score-asc': (a, b) => a.dormant_score - b.dormant_score,
        'recent': (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        'oldest': (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      };
      filtered = [...filtered].sort(sorters[sortBy] || sorters['score-desc']);

      // Pagination
      const total = filtered.length;
      const start = (pagination.page - 1) * pagination.perPage;
      const pageItems = filtered.slice(start, start + pagination.perPage);

      setLeads(pageItems);
      setPagination(prev => ({ ...prev, total }));
      setLoading(false);
    } else {
      fetchLeads();
    }
  }, [filterStatus, filterTier, searchTerm, sortBy, pagination.page, isDemoMode]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const apiUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
        ? 'http://localhost:3003'
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003');
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
      {isDemoMode && <AdminDemoGuide key={pathname} />}
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
                  <SearchIcon width={16} height={16} fill="currentColor" />
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
            <UsersIcon width={64} height={64} fill="#dee2e6" className="mb-3" />
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
