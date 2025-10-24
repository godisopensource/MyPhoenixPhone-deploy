'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
      sms: (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
        </svg>
      ),
      email: (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
        </svg>
      ),
      rcs: (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
        </svg>
      ),
      push: (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
        </svg>
      ),
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
          <svg className="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
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
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
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
            <svg width="64" height="64" fill="#dee2e6" viewBox="0 0 16 16" className="mb-3">
              <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
            </svg>
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
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
                            </svg>
                          </Link>
                          
                          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                            <>
                              <Link 
                                href={`/admin/campaigns/${campaign.id}/edit`}
                                className="btn btn-outline-secondary"
                                title="Modifier"
                              >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                  <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                                </svg>
                              </Link>
                              
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => handleSend(campaign.id, campaign.name)}
                                title="Lancer"
                                style={{ color: '#ff7900', borderColor: '#ff7900' }}
                              >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
                                </svg>
                              </button>
                            </>
                          )}
                          
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(campaign.id, campaign.name)}
                            title="Supprimer"
                          >
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
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
