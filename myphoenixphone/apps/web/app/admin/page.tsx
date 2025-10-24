'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Tableau de bord</h2>
          <p className="text-muted mb-0">Vue d'ensemble des leads dormants</p>
        </div>
        <Link href="/admin/campaigns/new" className="btn btn-primary" style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}>
          <svg className="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
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
                  <h3 className="mb-0">{stats.total_leads.toLocaleString()}</h3>
                </div>
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <svg width="24" height="24" fill="#ff7900" viewBox="0 0 16 16">
                    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                  </svg>
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
                  <h3 className="mb-0 text-success">{stats.by_status.eligible.toLocaleString()}</h3>
                  <small className="text-muted">{((stats.by_status.eligible / stats.total_leads) * 100).toFixed(1)}%</small>
                </div>
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <svg width="24" height="24" fill="green" viewBox="0 0 16 16">
                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                  </svg>
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
                  <h3 className="mb-0 text-info">{stats.by_status.contacted.toLocaleString()}</h3>
                  <small className="text-muted">Taux: {stats.conversion_funnel.conversion_rate.toFixed(1)}%</small>
                </div>
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <svg width="24" height="24" fill="blue" viewBox="0 0 16 16">
                    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                  </svg>
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
                    {(stats.value_distribution.total_potential_value / 1000).toFixed(0)}k€
                  </h3>
                  <small className="text-muted">Moy: {stats.value_distribution.average_value}€</small>
                </div>
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <svg width="24" height="24" fill="#ff7900" viewBox="0 0 16 16">
                    <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/>
                  </svg>
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
                {Object.entries(stats.by_tier).map(([tier, count]) => {
                  const tierNum = parseInt(tier.split('_')[1] || '0');
                  const percentage = (count / stats.total_leads) * 100;
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
                  <small className="fw-bold">{stats.conversion_funnel.eligible}</small>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-success" style={{ width: '100%' }} />
                </div>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Contactés</small>
                  <small className="fw-bold">{stats.conversion_funnel.contacted}</small>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-info" 
                    style={{ width: `${(stats.conversion_funnel.contacted / stats.conversion_funnel.eligible) * 100}%` }} 
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Convertis</small>
                  <small className="fw-bold">{stats.conversion_funnel.converted}</small>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar" 
                    style={{ 
                      width: `${(stats.conversion_funnel.converted / stats.conversion_funnel.eligible) * 100}%`,
                      backgroundColor: '#ff7900'
                    }} 
                  />
                </div>
              </div>

              <hr />
              
              <div className="text-center">
                <div className="display-6 fw-bold" style={{ color: '#ff7900' }}>
                  {stats.conversion_funnel.conversion_rate.toFixed(1)}%
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
              <svg width="48" height="48" fill="#ff7900" viewBox="0 0 16 16" className="mb-3">
                <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
              </svg>
              <h5>Gérer les Campagnes</h5>
              <p className="text-muted mb-0">Créer et suivre vos campagnes de nudge</p>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link href="/admin/leads" className="card border-0 shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <svg width="48" height="48" fill="#0dcaf0" viewBox="0 0 16 16" className="mb-3">
                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              </svg>
              <h5>Explorer les Leads</h5>
              <p className="text-muted mb-0">Filtrer et analyser les leads dormants</p>
            </div>
          </Link>
        </div>

        <div className="col-md-4">
          <Link href="/admin/templates" className="card border-0 shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <svg width="48" height="48" fill="#198754" viewBox="0 0 16 16" className="mb-3">
                <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
              </svg>
              <h5>Templates SMS</h5>
              <p className="text-muted mb-0">Gérer les modèles de messages</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
