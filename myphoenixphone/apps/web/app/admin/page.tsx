'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BoxIcon, CheckIcon, InfoIcon, PrintIcon, UserIcon } from '../components/solaris-icons';

interface DormantStats {
  total_leads: number;
  by_status: {
    eligible: number;
    contacted: number;
    responded: number;
    converted: number;
    expired: number;
  };
  by_tier: {
    tier_0: number;
    tier_1: number;
    tier_2: number;
    tier_3: number;
    tier_4: number;
    tier_5: number;
  };
  value_distribution: {
    total_potential_value: number;
    average_value: number;
    median_value: number;
  };
  conversion_funnel: {
    eligible: number;
    contacted: number;
    responded: number;
    converted: number;
    conversion_rate: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DormantStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const response = await fetch(`${apiUrl}/dormant/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="alert alert-danger" role="alert">
        Erreur lors du chargement des statistiques
      </div>
    );
  }
  // safe accessors with fallbacks to avoid runtime errors when API returns partial data
  const totalLeads = stats?.total_leads ?? 0;
  const byStatus = stats?.by_status ?? { eligible: 0, contacted: 0, responded: 0, converted: 0, expired: 0 };
  const byTier = stats?.by_tier ?? { tier_0: 0, tier_1: 0, tier_2: 0, tier_3: 0, tier_4: 0, tier_5: 0 };
  const valueDist = stats?.value_distribution ?? { total_potential_value: 0, average_value: 0, median_value: 0 };
  const funnel = stats?.conversion_funnel ?? { eligible: 0, contacted: 0, responded: 0, converted: 0, conversion_rate: 0 };

  const percent = (n: number, total: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Tableau de bord</h2>
          <p className="text-muted mb-0">Vue d'ensemble des leads dormants</p>
        </div>
        <Link href="/admin/campaigns/new" className="btn btn-primary" style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}>
          <BoxIcon className="me-2" width={16} height={16} />
          Nouvelle campagne
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Total Leads</p>
                  <h3 className="mb-0">{totalLeads.toLocaleString()}</h3>
                </div>
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <CheckIcon width={24} height={24} fill="#ff7900" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Éligibles</p>
                  <h3 className="mb-0 text-success">{byStatus.eligible.toLocaleString()}</h3>
                  <small className="text-muted">{percent(byStatus.eligible, totalLeads)}%</small>
                </div>
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <CheckIcon width={24} height={24} fill="green" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Contactés</p>
                  <h3 className="mb-0 text-info">{byStatus.contacted.toLocaleString()}</h3>
                  <small className="text-muted">Taux: {funnel.conversion_rate.toFixed(1)}%</small>
                </div>
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <InfoIcon width={24} height={24} fill="blue" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 small">Valeur Totale</p>
                  <h3 className="mb-0" style={{ color: '#ff7900' }}>
                    {(valueDist.total_potential_value / 1000).toFixed(0)}k€
                  </h3>
                  <small className="text-muted">Moy: {valueDist.average_value}€</small>
                </div>
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <BoxIcon width={24} height={24} fill="#ff7900" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution by Tier */}
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="mb-0">Distribution par Tier</h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {Object.entries(byTier).map(([tier, count]) => {
                  const tierNum = parseInt(tier.split('_')[1] || '0');
                  const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  const colors = ['#6c757d', '#0d6efd', '#0dcaf0', '#198754', '#ff7900', '#dc3545'];
                  
                  return (
                    <div key={tier} className="col-md-4">
                      <div className="border rounded p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge" style={{ backgroundColor: colors[tierNum] }}>
                            Tier {tierNum}
                          </span>
                          <strong>{count}</strong>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div 
                            className="progress-bar" 
                            style={{ width: `${percentage}%`, backgroundColor: colors[tierNum] }}
                          />
                        </div>
                        <small className="text-muted">{percentage.toFixed(1)}%</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="mb-0">Conversion Funnel</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Éligibles</small>
                  <small className="fw-bold">{funnel.eligible}</small>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-success" style={{ width: '100%' }} />
                </div>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Contactés</small>
                  <small className="fw-bold">{funnel.contacted}</small>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-info" 
                    style={{ width: `${(funnel.eligible > 0 ? (funnel.contacted / funnel.eligible) * 100 : 0)}%` }} 
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Convertis</small>
                  <small className="fw-bold">{funnel.converted}</small>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar" 
                    style={{ 
                      width: `${(funnel.eligible > 0 ? (funnel.converted / funnel.eligible) * 100 : 0)}%`,
                      backgroundColor: '#ff7900'
                    }} 
                  />
                </div>
              </div>

              <hr />
              
              <div className="text-center">
                <div className="display-6 fw-bold" style={{ color: '#ff7900' }}>
                  {funnel.conversion_rate.toFixed(1)}%
                </div>
                <small className="text-muted">Taux de conversion</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row g-3">
        <div className="col-md-4">
          <Link href="/admin/campaigns" className="card border-0 shadow-sm text-decoration-none text-dark h-100">
              <div className="card-body text-center py-4">
              <BoxIcon width={48} height={48} fill="#ff7900" className="mb-3" />
              <h5>Gérer les Campagnes</h5>
              <p className="text-muted mb-0">Créer et suivre vos campagnes de nudge</p>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link href="/admin/leads" className="card border-0 shadow-sm text-decoration-none text-dark h-100">
              <div className="card-body text-center py-4">
              <UserIcon width={48} height={48} fill="#0dcaf0" className="mb-3" />
              <h5>Explorer les Leads</h5>
              <p className="text-muted mb-0">Filtrer et analyser les leads dormants</p>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link href="/admin/templates" className="card border-0 shadow-sm text-decoration-none text-dark h-100">
              <div className="card-body text-center py-4">
              <PrintIcon width={48} height={48} fill="#198754" className="mb-3" />
              <h5>Templates SMS</h5>
              <p className="text-muted mb-0">Gérer les modèles de messages</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
