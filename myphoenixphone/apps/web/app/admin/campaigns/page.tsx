'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InfoIcon, BoxIcon, TruckIcon, CrossIcon, CheckIcon, PrintIcon } from '../../components/solaris-icons';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  channel: 'sms' | 'email' | 'rcs' | 'push';
  estimated_reach: number;
  total_sent: number;
  total_delivered: number;
  total_clicked: number;
  total_converted: number;
  scheduled_at?: string;
  sent_at?: string;
  completed_at?: string;
  created_at: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchCampaigns();
  }, [filterStatus]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      const response = await fetch(`${apiUrl}/campaign?${params.toString()}`);
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, campaignName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la campagne "${campaignName}" ?`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const response = await fetch(`${apiUrl}/campaign/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCampaigns(); // Refresh list
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSend = async (id: string, campaignName: string) => {
    if (!confirm(`Lancer l'envoi de la campagne "${campaignName}" ?`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const response = await fetch(`${apiUrl}/campaign/${id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchCampaigns(); // Refresh list
        alert('Campagne lancée avec succès !');
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to send campaign:', error);
      alert('Erreur lors du lancement');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { bg: 'secondary', label: 'Brouillon' },
      scheduled: { bg: 'info', label: 'Programmée' },
      sending: { bg: 'warning', label: 'En cours' },
      completed: { bg: 'success', label: 'Terminée' },
      cancelled: { bg: 'dark', label: 'Annulée' },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    return <span className={`badge bg-${badge.bg}`}>{badge.label}</span>;
  };

  const getChannelIcon = (channel: string) => {
    const icons = {
      sms: <InfoIcon width={16} height={16} />,
      email: <PrintIcon width={16} height={16} />,
      rcs: <InfoIcon width={16} height={16} />,
      push: <InfoIcon width={16} height={16} />,
    };
    return icons[channel as keyof typeof icons] || icons.sms;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Campagnes de Nudge</h2>
          <p className="text-muted mb-0">Gérer vos campagnes d'activation</p>
        </div>
        <Link 
          href="/admin/campaigns/new" 
          className="btn btn-primary"
          style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}
        >
          <BoxIcon className="me-2" width={16} height={16} />
          Nouvelle campagne
        </Link>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <label className="form-label mb-0 me-2">Statut:</label>
            </div>
            <div className="col-auto">
              <select 
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="draft">Brouillon</option>
                <option value="scheduled">Programmées</option>
                <option value="sending">En cours</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>
            <div className="col-auto">
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchCampaigns}
              >
                <InfoIcon width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <InfoIcon width={64} height={64} className="mb-3" fill="#dee2e6" />
            <h5 className="text-muted">Aucune campagne</h5>
            <p className="text-muted mb-3">
              {filterStatus !== 'all' 
                ? `Aucune campagne avec le statut "${filterStatus}"`
                : "Commencez par créer votre première campagne"}
            </p>
            {filterStatus === 'all' && (
              <Link 
                href="/admin/campaigns/new" 
                className="btn btn-primary"
                style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}
              >
                Créer une campagne
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Campagne</th>
                  <th>Canal</th>
                  <th>Statut</th>
                  <th className="text-end">Portée</th>
                  <th className="text-end">Envoyés</th>
                  <th className="text-end">Clics</th>
                  <th className="text-end">Conversions</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const clickRate = campaign.total_sent > 0 
                    ? ((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1)
                    : '0';
                  const conversionRate = campaign.total_sent > 0
                    ? ((campaign.total_converted / campaign.total_sent) * 100).toFixed(1)
                    : '0';

                  return (
                    <tr key={campaign.id}>
                      <td>
                        <div>
                          <div className="fw-semibold">{campaign.name}</div>
                          {campaign.description && (
                            <small className="text-muted">{campaign.description}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="d-inline-flex align-items-center">
                          {getChannelIcon(campaign.channel)}
                          <span className="ms-1 text-uppercase small">{campaign.channel}</span>
                        </span>
                      </td>
                      <td>{getStatusBadge(campaign.status)}</td>
                      <td className="text-end">
                        <span className="badge bg-secondary">{campaign.estimated_reach}</span>
                      </td>
                      <td className="text-end">
                        {campaign.total_sent > 0 ? (
                          <strong>{campaign.total_sent}</strong>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="text-end">
                        {campaign.total_clicked > 0 ? (
                          <div>
                            <strong>{campaign.total_clicked}</strong>
                            <small className="text-muted ms-1">({clickRate}%)</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="text-end">
                        {campaign.total_converted > 0 ? (
                          <div>
                            <strong style={{ color: '#ff7900' }}>{campaign.total_converted}</strong>
                            <small className="text-muted ms-1">({conversionRate}%)</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(campaign.sent_at || campaign.scheduled_at || campaign.created_at).toLocaleDateString('fr-FR')}
                        </small>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link 
                            href={`/admin/campaigns/${campaign.id}/stats`}
                            className="btn btn-outline-secondary"
                            title="Statistiques"
                          >
                            <CheckIcon width={14} height={14} />
                          </Link>
                          
                          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                            <>
                              <Link 
                                href={`/admin/campaigns/${campaign.id}/edit`}
                                className="btn btn-outline-secondary"
                                title="Modifier"
                              >
                                <BoxIcon width={14} height={14} />
                              </Link>
                              
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => handleSend(campaign.id, campaign.name)}
                                title="Lancer"
                                style={{ color: '#ff7900', borderColor: '#ff7900' }}
                              >
                                <TruckIcon width={14} height={14} />
                              </button>
                            </>
                          )}
                          
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(campaign.id, campaign.name)}
                            title="Supprimer"
                          >
                            <CrossIcon width={14} height={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
