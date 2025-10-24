'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Stats {
  id: string;
  name: string;
  status: string;
  total_sent: number;
  total_delivered: number;
  total_clicked: number;
  total_converted: number;
  delivered_rate: number;
  click_rate: number;
  conversion_rate: number;
  recent_attempts: Array<{ msisdn_masked: string; status: string; created_at: string }>;
}

export default function CampaignStatsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const res = await fetch(`${apiUrl}/campaign/${id}/stats`);
      if (!res.ok) throw new Error('Failed');
      const body = await res.json();
      setStats(body);
    } catch (err) {
      console.error('fetch stats', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" role="status"/></div>;
  if (!stats) return <div className="alert alert-danger">Impossible de charger les statistiques</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Statistiques : {stats.name}</h2>
          <p className="text-muted mb-0">Statut: <strong>{stats.status}</strong></p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 text-center">
            <small className="text-muted">Envoyés</small>
            <div className="h3 mt-2">{stats.total_sent}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 text-center">
            <small className="text-muted">Livrés</small>
            <div className="h3 mt-2">{stats.total_delivered} <small className="text-muted">({(stats.delivered_rate*100).toFixed(1)}%)</small></div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 text-center">
            <small className="text-muted">Clics</small>
            <div className="h3 mt-2">{stats.total_clicked} <small className="text-muted">({(stats.click_rate*100).toFixed(1)}%)</small></div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 text-center">
            <small className="text-muted">Conversions</small>
            <div className="h3 mt-2" style={{ color: '#ff7900' }}>{stats.total_converted} <small className="text-muted">({(stats.conversion_rate*100).toFixed(1)}%)</small></div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">Tentatives récentes</div>
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>msisdn</th>
                <th>status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_attempts.map((a, idx) => (
                <tr key={idx}>
                  <td>{a.msisdn_masked}</td>
                  <td>{a.status}</td>
                  <td>{new Date(a.created_at).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
