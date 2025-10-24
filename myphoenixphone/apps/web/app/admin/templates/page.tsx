'use client';

import { useEffect, useState } from 'react';
import { InfoIcon, BoxIcon, CrossIcon, CheckIcon, PrintIcon } from '../../components/solaris-icons';

interface Template {
  id: string;
  name: string;
  channel: 'sms' | 'email' | 'rcs' | 'push';
  subject?: string;
  content: string;
  variants: {
    a: string;
    b?: string;
    c?: string;
    d?: string;
  };
  placeholders: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl_sms_01',
    name: 'Offre Estimation Gratuite',
    channel: 'sms',
    content: 'Base : Bonjour ! Orange vous propose une offre pour votre ancien téléphone. Estimation gratuite : {url}',
    variants: {
      a: `Bonjour ! Orange vous propose une offre pour votre ancien téléphone. Estimation gratuite : {url}`,
      b: `Votre téléphone vaut de l'argent ! Découvrez combien avec Orange : {url}`,
      c: `Ne jetez pas votre ancien mobile ! Orange vous le reprend. Cliquez ici : {url}`,
      d: `Offre spéciale Orange : faites estimer votre téléphone gratuitement {url}`,
    },
    placeholders: ['{url}'],
    usage_count: 1250,
    created_at: '2025-10-15T10:00:00Z',
    updated_at: '2025-10-21T14:30:00Z',
  },
  {
    id: 'tpl_sms_02',
    name: 'Relance Client',
    channel: 'sms',
    content: 'Base : Vous aviez consulté une offre chez Orange. Avez-vous des questions ? On peut vous rappeler !',
    variants: {
      a: `Vous aviez consulté une offre chez Orange. Avez-vous des questions ? On peut vous rappeler !`,
      b: `Intéressé par l'offre Orange ? Notre équipe vous recontacte avec plaisir. Cliquez ici : {url}`,
      c: `Votre estimation Orange était de {price}€. Toujours intéressé ? {url}`,
      d: `Dernière chance : offre valide jusqu'à demain ! {url}`,
    },
    placeholders: ['{url}', '{price}'],
    usage_count: 350,
    created_at: '2025-10-16T11:00:00Z',
    updated_at: '2025-10-18T09:15:00Z',
  },
  {
    id: 'tpl_email_01',
    name: 'Bienvenue Client',
    channel: 'email',
    subject: 'Bienvenue chez Orange - Estimation de votre téléphone',
    content: `Bonjour {prenom},

Merci de vous être intéressé à Orange. Nous avons évalué votre appareil à {price}€.

Cliquez ici pour confirmer votre intérêt : {url}

Cordialement,
Équipe Orange`,
    variants: {
      a: `Estimation gratuite réalisée pour vous !`,
    },
    placeholders: ['{prenom}', '{price}', '{url}'],
    usage_count: 580,
    created_at: '2025-10-17T08:00:00Z',
    updated_at: '2025-10-20T16:45:00Z',
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Template>>({
    name: '',
    channel: 'sms',
    subject: '',
    content: '',
    variants: { a: '' },
  });

  const filteredTemplates = templates.filter(
    t => filterChannel === 'all' || t.channel === filterChannel
  );

  const handleEdit = (template: Template) => {
    setFormData(template);
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      // In a real app, this would save to the backend
      if (editingId) {
        setTemplates(prev =>
          prev.map(t => (t.id === editingId ? { ...t, ...formData } : t))
        );
      } else {
        const newTemplate = {
          ...formData,
          id: `tpl_${formData.channel}_${Date.now()}`,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Template;
        setTemplates(prev => [...prev, newTemplate]);
      }

      // Reset form
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        channel: 'sms',
        subject: '',
        content: '',
        variants: { a: '' },
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le template "${name}" ?`)) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
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

  const getChannelLabel = (channel: string) => {
    const labels = {
      sms: 'SMS',
      email: 'Email',
      rcs: 'RCS',
      push: 'Push',
    };
    return labels[channel as keyof typeof labels] || channel;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Modèles de Messages</h2>
          <p className="text-muted mb-0">Gérer vos templates de communication</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              channel: 'sms',
              subject: '',
              content: '',
              variants: { a: '' },
            });
            setShowForm(!showForm);
          }}
          style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}
        >
          <BoxIcon className="me-2" width={16} height={16} />
          Nouveau template
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Nom du template</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Offre Estimation Gratuite"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Canal</label>
                <select
                  className="form-select"
                  value={formData.channel || 'sms'}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      channel: e.target.value as any,
                    }))
                  }
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="rcs">RCS</option>
                  <option value="push">Push</option>
                </select>
              </div>
            </div>

            {formData.channel === 'email' && (
              <div className="mb-3">
                <label className="form-label">Sujet (Email)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Sujet de l'email"
                  value={formData.subject || ''}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, subject: e.target.value }))
                  }
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Contenu (Variante A)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Contenu du message avec les placeholders: {url}, {prenom}, {price}..."
                value={formData.variants?.a || ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    variants: { ...prev.variants, a: e.target.value },
                  }))
                }
              />
              <small className="text-muted">
                Placeholders disponibles: {'{'}{'{url}, {prenom}, {price}'}{'}'}
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label">Variantes B, C, D (optionnel)</label>
              <div className="row">
                <div className="col-md-6 mb-2">
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Variante B"
                    value={formData.variants?.b || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        variants: { ...(prev.variants || { a: '' }), b: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="col-md-6 mb-2">
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Variante C"
                    value={formData.variants?.c || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        variants: { ...(prev.variants || { a: '' }), c: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <textarea
                className="form-control mt-2"
                rows={2}
                placeholder="Variante D"
                value={formData.variants?.d || ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    variants: { ...(prev.variants || { a: '' }), d: e.target.value },
                  }))
                }
              />
            </div>

              <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}
              >
                <CheckIcon className="me-2" width={16} height={16} />
                Enregistrer
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <label className="form-label mb-0 me-2">Canal:</label>
            </div>
            <div className="col-auto">
              <select
                className="form-select form-select-sm"
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
              >
                <option value="all">Tous les canaux</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="rcs">RCS</option>
                <option value="push">Push</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="row g-3">
        {filteredTemplates.length === 0 ? (
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <InfoIcon width={64} height={64} className="mb-3" fill="#dee2e6" />
                <h5 className="text-muted">Aucun template</h5>
                <p className="text-muted mb-0">Commencez par créer votre premier modèle</p>
              </div>
            </div>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div key={template.id} className="col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="flex-grow-1">
                      <h6 className="card-title mb-1">{template.name}</h6>
                      <div className="d-flex align-items-center gap-2">
                        <span className="d-inline-flex align-items-center">
                          {getChannelIcon(template.channel)}
                          <span className="ms-1 text-uppercase small fw-semibold">
                            {getChannelLabel(template.channel)}
                          </span>
                        </span>
                        <span className="badge bg-secondary">{template.usage_count} uses</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(template.id, template.name)}
                    >
                      <CrossIcon width={14} height={14} />
                    </button>
                  </div>

                  {template.subject && (
                    <div className="mb-2">
                      <small className="text-muted d-block">Sujet:</small>
                      <small className="text-dark">{template.subject}</small>
                    </div>
                  )}

                  <div className="mb-3">
                    <small className="text-muted d-block">Contenu (Variante A):</small>
                    <p className="small text-dark mb-0">
                      {template.variants.a.substring(0, 100)}
                      {template.variants.a.length > 100 ? '...' : ''}
                    </p>
                  </div>

                  {(template.variants.b || template.variants.c || template.variants.d) && (
                    <div className="mb-3">
                      <small className="text-muted">
                        <CheckIcon className="me-1" width={12} height={12} />
                        Tests A/B/C/D
                      </small>
                    </div>
                  )}

                  <div className="pt-2 border-top">
                    <small className="text-muted">
                      Mise à jour: {new Date(template.updated_at).toLocaleDateString('fr-FR')}
                    </small>
                  </div>
                </div>
                <div className="card-footer bg-white border-top-0">
                  <button
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={() => handleEdit(template)}
                  >
                    <BoxIcon className="me-1" width={14} height={14} />
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
