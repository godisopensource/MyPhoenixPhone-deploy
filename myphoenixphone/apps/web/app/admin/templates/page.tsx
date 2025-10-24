'use client';

import { useEffect, useState } from 'react';

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
          <svg className="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
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
                <svg className="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.71l-5.223 2.206A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                </svg>
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
                <svg width="64" height="64" fill="#dee2e6" viewBox="0 0 16 16" className="mb-3">
                  <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                </svg>
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
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
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
                        <svg width="12" height="12" fill="currentColor" className="me-1" viewBox="0 0 16 16">
                          <circle cx="8" cy="8" r="8"/>
                        </svg>
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
                    <svg className="me-1" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                      <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                    </svg>
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
