'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email' | 'rcs' | 'push'>('sms');
  const [templateId, setTemplateId] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [maxPerHour, setMaxPerHour] = useState<number>(100);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    fetchCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCampaign = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const res = await fetch(`${apiUrl}/campaign/${id}`);
      if (!res.ok) throw new Error('Failed');
      const body = await res.json();
      setName(body.name || '');
      setDescription(body.description || '');
      setChannel(body.channel || 'sms');
      setTemplateId(body.template_id || '');
      setScheduledAt(body.scheduled_at || null);
      setMaxPerHour(body.max_per_hour ?? 100);
      setBatchSize(body.batch_size ?? 10);
      setFilters(body.target_filters || {});
    } catch (err) {
      console.error('fetch campaign', err);
      alert('Impossible de charger la campagne');
      router.push('/admin/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
      const payload: any = {
        name,
        description,
        channel,
        template_id: templateId,
        target_filters: filters,
        scheduled_at: scheduledAt,
        max_per_hour: maxPerHour,
        batch_size: batchSize,
      };

      const res = await fetch(`${apiUrl}/campaign/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        alert('Erreur: ' + (body.message || 'erreur'));
      } else {
        router.push('/admin/campaigns');
      }
    } catch (err) {
      console.error('Update failed', err);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" role="status"/></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Modifier la campagne</h2>
          <p className="text-muted mb-0">Éditez les informations et la planification</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="card border-0 shadow-sm p-3">
        <div className="row g-3">
          <div className="col-md-8">
            <div className="mb-3">
              <label className="form-label">Nom de la campagne</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="mb-3">
              <label className="form-label">Description (optionnelle)</label>
              <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label">Canal</label>
                <select className="form-select" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="rcs">RCS</option>
                  <option value="push">Push</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Template (ID)</label>
                <input className="form-control" value={templateId} onChange={(e) => setTemplateId(e.target.value)} placeholder="ex: tpl_123" />
              </div>
            </div>

            <hr />

            <h6>Audience ciblée</h6>

            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-4">
                <label className="form-label">Statut</label>
                <select className="form-select" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}>
                  <option value="">Tous</option>
                  <option value="eligible">Éligible</option>
                  <option value="contacted">Contacté</option>
                  <option value="converted">Converti</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Tier minimal</label>
                <select className="form-select" value={String(filters.tier ?? '')} onChange={(e) => setFilters({ ...filters, tier: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Tous</option>
                  <option value="0">Tier 0</option>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                  <option value="4">Tier 4</option>
                  <option value="5">Tier 5</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Inactif depuis (avant)</label>
                <input type="date" className="form-control" value={filters.lastActiveBefore || ''} onChange={(e) => setFilters({ ...filters, lastActiveBefore: e.target.value || undefined })} />
              </div>
            </div>

            <hr />

            <h6>Planification & throttling</h6>

            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label">Planifié à</label>
                <input type="datetime-local" className="form-control" value={scheduledAt || ''} onChange={(e) => setScheduledAt(e.target.value || null)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Max / heure</label>
                <input type="number" className="form-control" value={maxPerHour} onChange={(e) => setMaxPerHour(Number(e.target.value))} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Taille batch</label>
                <input type="number" className="form-control" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }} disabled={submitting}>
                {submitting ? 'Mise à jour…' : 'Mettre à jour'}
              </button>

              <button type="button" className="btn btn-outline-secondary" onClick={() => router.push('/admin/campaigns')}>
                Annuler
              </button>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3">
              <h6>Preview message</h6>
              <div className="mb-2 text-muted small">Aperçu du message (template) et URL</div>
              <div className="border rounded p-3 bg-light">
                <p className="mb-1">{`Bonjour {{prenom}},`}</p>
                <p className="mb-1">Nous avons une offre pour votre appareil — cliquez pour en savoir plus:</p>
                <p className="mb-0 text-truncate"><a href="#">http://localhost:3000/lead/LEAD_ID</a></p>
              </div>

              <hr />

              <div>
                <h6 className="mb-2">Récap</h6>
                <dl className="row">
                  <dt className="col-6">Canal</dt><dd className="col-6 text-end text-uppercase">{channel}</dd>
                  <dt className="col-6">Template</dt><dd className="col-6 text-end">{templateId || '-'} </dd>
                  <dt className="col-6">Taille estimée</dt><dd className="col-6 text-end">- </dd>
                  <dt className="col-6">Max / h</dt><dd className="col-6 text-end">{maxPerHour}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
