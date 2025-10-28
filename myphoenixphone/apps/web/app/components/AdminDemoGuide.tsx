'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface GuideStep {
  title: string;
  description: string;
  path: string;
  icon: string;
}

const guideSteps: GuideStep[] = [
  {
    title: 'Dashboard - Vue d\'ensemble',
    description: 'Le tableau de bord présente les statistiques clés : nombre de leads détectés via les Network APIs, taux de conversion, et valeur potentielle. Les métriques sont calculées en temps réel à partir des données dormant.',
    path: '/admin',
    icon: 'bi-speedometer2'
  },
  {
    title: 'Campagnes - Gestion des nudges',
    description: 'Créez et gérez vos campagnes de nudge SMS. Ciblez des cohortes spécifiques (par tier, statut, modèle de téléphone) et suivez les performances en temps réel. Les campagnes utilisent les templates SMS pour personnaliser les messages.',
    path: '/admin/campaigns',
    icon: 'bi-megaphone'
  },
  {
    title: 'Leads - Explorer les opportunités',
    description: 'Explorez tous les leads dormants détectés par le système. Filtrez par statut (eligible, contacted, converted), tier de valeur, ou modèle de téléphone. Chaque lead est enrichi avec les signaux d\'éligibilité provenant des Network APIs.',
    path: '/admin/leads',
    icon: 'bi-people'
  },
  {
    title: 'Templates - Personnaliser les messages',
    description: 'Gérez vos modèles de messages SMS avec variables dynamiques (prénom, valeur estimée, modèle). Les templates supportent la personnalisation avancée pour maximiser l\'engagement et respectent les contraintes de longueur SMS.',
    path: '/admin/templates',
    icon: 'bi-file-earmark-text'
  }
];

export function AdminDemoGuide() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Find current step based on pathname
  useEffect(() => {
    if (!pathname) return;

    let matchedIndex = -1;
    let bestLength = -1;

    guideSteps.forEach((step, index) => {
      const isExactMatch = pathname === step.path;
      const isChildPath = pathname.startsWith(`${step.path}/`);
      if ((isExactMatch || isChildPath) && step.path.length > bestLength) {
        matchedIndex = index;
        bestLength = step.path.length;
      }
    });

    if (matchedIndex >= 0) {
      setCurrentStepIndex(matchedIndex);
    }
  }, [pathname]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleShowAgain = () => {
    setIsVisible(true);
  };

  if (!isVisible) {
    return (
      <button
        onClick={handleShowAgain}
        className="btn btn-sm btn-outline-primary mb-3"
        title="Afficher le guide démo"
      >
        <i className="bi bi-question-circle me-2"></i>
        Afficher le guide
      </button>
    );
  }

  const currentStep = guideSteps[currentStepIndex];
  if (!currentStep) return null;
  
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === guideSteps.length - 1;

  const goTo = (path: string) => {
    try {
      router.push(path);
    } catch {}
  };

  return (
    <>
      {/* Demo guide card */}
      {isVisible && (
        <div className="card border-primary mb-4" style={{ borderWidth: '2px', borderColor: '#ff7900' }}>
          <div className="card-header text-white d-flex justify-content-between align-items-center" style={{ backgroundColor: '#ff7900' }}>
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '1.25rem' }}></i>
              <strong>Guide Démonstration - Étape {currentStepIndex + 1}/{guideSteps.length}</strong>
            </div>
            <button
              onClick={handleDismiss}
              className="btn btn-sm btn-outline-light"
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="card-body">
            <div className="d-flex align-items-start gap-3 mb-3">
              <div className="flex-shrink-0">
                <div 
                  className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px' }}
                >
                  <i className={`${currentStep.icon} text-primary`} style={{ fontSize: '1.5rem' }}></i>
                </div>
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-2">{currentStep.title}</h5>
                <p className="mb-0 text-muted">{currentStep.description}</p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="d-flex justify-content-center gap-2 mb-3">
              {guideSteps.map((_, index) => (
                <div
                  key={index}
                  className="rounded-circle"
                  style={{ 
                    width: '10px', 
                    height: '10px',
                    backgroundColor: index === currentStepIndex ? '#ff7900' : 'rgba(0,0,0,0.1)'
                  }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="d-flex justify-content-between align-items-center">
              <div>
                {!isFirstStep && guideSteps[currentStepIndex - 1] && (
                  <button
                    type="button"
                    onClick={() => goTo(guideSteps[currentStepIndex - 1]!.path)}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Précédent
                  </button>
                )}
              </div>
              <div className="d-flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Masquer le guide
                </button>
                {!isLastStep && guideSteps[currentStepIndex + 1] ? (
                  <button
                    type="button"
                    onClick={() => goTo(guideSteps[currentStepIndex + 1]!.path)}
                    className="btn btn-sm text-white"
                    style={{ backgroundColor: '#ff7900', borderColor: '#ff7900' }}
                  >
                    Suivant
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                ) : (
                  <button
                    onClick={handleDismiss}
                    className="btn btn-sm text-white"
                    style={{ backgroundColor: '#50be87', borderColor: '#50be87' }}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Terminer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
