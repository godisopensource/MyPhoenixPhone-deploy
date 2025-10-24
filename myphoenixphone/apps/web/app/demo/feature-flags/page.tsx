'use client';

import { useState } from 'react';
import { useFeatureFlag, VariantSwitch } from '../../hooks/useFeatureFlags';
import { a11y, aria, semantic } from '../../utils/accessibility';
import { CheckIcon, WarningIcon } from '../../components/solaris-icons';

export default function FeatureFlagsDemo() {
  const [userId, setUserId] = useState('demo-user-123');
  const copyVariant = useFeatureFlag('ab_copy_variant', userId);
  const geofencing = useFeatureFlag('geofencing_enabled');

  return (
    <semantic.Main>
      <a11y.SkipLink />
      
      <div className="container py-5">
        <h1 style={{ color: '#ff7900' }}>Feature Flags Demo</h1>
        <p className="lead">Démonstration du système de feature flags et A/B testing</p>

        <section className="mt-4">
          <h2 className="h4">État des Feature Flags</h2>
          
          <div className="card mt-3">
            <div className="card-body">
              <h3 className="h5">
                <CheckIcon className="me-2" aria-hidden="true" />
                Copy Variant A/B Test
              </h3>
              <dl className="row mb-0">
                <dt className="col-sm-3">Status:</dt>
                <dd className="col-sm-9">
                  {copyVariant.loading ? (
                    <span {...aria.loading}>Chargement...</span>
                  ) : copyVariant.enabled ? (
                    <span className="badge bg-success">Activé</span>
                  ) : (
                    <span className="badge bg-secondary">Désactivé</span>
                  )}
                </dd>

                <dt className="col-sm-3">Variante:</dt>
                <dd className="col-sm-9">
                  <code>{copyVariant.variant || 'N/A'}</code>
                </dd>

                <dt className="col-sm-3">User ID:</dt>
                <dd className="col-sm-9">
                  <input
                    type="text"
                    className="form-control form-control-sm d-inline-block"
                    style={{ width: 'auto' }}
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    aria-label="User ID pour test A/B"
                  />
                </dd>
              </dl>
            </div>
          </div>

          <div className="card mt-3">
            <div className="card-body">
              <h3 className="h5">
                <CheckIcon className="me-2" aria-hidden="true" />
                Géofencing
              </h3>
              <dl className="row mb-0">
                <dt className="col-sm-3">Status:</dt>
                <dd className="col-sm-9">
                  {geofencing.loading ? (
                    <span {...aria.loading}>Chargement...</span>
                  ) : geofencing.enabled ? (
                    <span className="badge bg-success">Activé</span>
                  ) : (
                    <span className="badge bg-secondary">Désactivé</span>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="h4">Exemple: Message SMS selon variante</h2>
          
          <VariantSwitch
            flag="ab_copy_variant"
            userId={userId}
            defaultVariant={
              <div className="alert alert-secondary">
                <WarningIcon className="me-2" aria-hidden="true" />
                Chargement de la variante...
              </div>
            }
            variants={{
              control: (
                <div className="card border-primary">
                  <div className="card-header bg-primary text-white">
                    <strong>Variante Control (neutre)</strong>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">
                      <em>&quot;Bonjour, votre téléphone dort dans un tiroir ? Orange le reprend ! 
                      Obtenez une estimation en 2 min : https://mpp.orange.fr/abc123&quot;</em>
                    </p>
                  </div>
                </div>
              ),
              variant_a: (
                <div className="card border-danger">
                  <div className="card-header bg-danger text-white">
                    <strong>Variante A (directe/urgente)</strong>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">
                      <em>&quot;Téléphone inutilisé ? Transformez-le en valeur MAINTENANT avec Orange. 
                      2 min pour estimer : https://mpp.orange.fr/abc123&quot;</em>
                    </p>
                  </div>
                </div>
              ),
              variant_b: (
                <div className="card border-success">
                  <div className="card-header bg-success text-white">
                    <strong>Variante B (empathique/environnement)</strong>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">
                      <em>&quot;Participez à l&apos;économie circulaire : donnez une 2e vie à votre téléphone 
                      avec Orange. Estimation gratuite : https://mpp.orange.fr/abc123&quot;</em>
                    </p>
                  </div>
                </div>
              ),
            }}
          />
        </section>

        <section className="mt-5">
          <h2 className="h4">Accessibilité</h2>
          <ul>
            <li>Navigation clavier : <kbd>Tab</kbd>, <kbd>Shift+Tab</kbd></li>
            <li>Lecteurs d&apos;écran : VoiceOver, NVDA compatible</li>
            <li>Contraste : WCAG 2.1 AA compliant</li>
            <li>Skip link : Essayez <kbd>Tab</kbd> depuis le haut de page</li>
          </ul>
        </section>

        <div className="mt-4">
          <a href="/" className="btn btn-link">← Retour à l&apos;accueil</a>
        </div>
      </div>
    </semantic.Main>
  );
}
