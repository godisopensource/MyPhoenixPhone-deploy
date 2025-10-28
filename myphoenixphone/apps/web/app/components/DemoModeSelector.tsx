'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDemo, DEMO_SCENARIOS, DemoScenario } from '../contexts/DemoContext';

export function DemoModeSelector() {
  const pathname = usePathname();
  const { isDemoMode, currentScenario, setDemoMode, selectScenario, clearScenario } = useDemo();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Don't show on homepage (it has its own demo button) or admin pages
  if (pathname === '/' || pathname?.startsWith('/admin')) {
    return null;
  }

  // Get unique tags
  const allTags = Array.from(new Set(DEMO_SCENARIOS.flatMap(s => s.tags))).sort();

  // Filter scenarios
  const filteredScenarios = DEMO_SCENARIOS.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.phoneNumber.includes(searchTerm);
    const matchesTag = !selectedTag || scenario.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleScenarioSelect = (scenario: DemoScenario) => {
    selectScenario(scenario.id);
    setIsOpen(false);
  };

  const handleToggleDemoMode = () => {
    if (isDemoMode) {
      setDemoMode(false);
      setIsOpen(false);
    } else {
      setDemoMode(true);
      setIsOpen(true);
    }
  };

  if (!isDemoMode && !isOpen) {
    return (
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
        <button
          type="button"
          className="btn btn-warning btn-lg"
          onClick={handleToggleDemoMode}
          title="Activer le mode démo"
        >
          <span className="visually-hidden">Activer le mode démo</span>
          <svg width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false">
            <use xlinkHref="#icon-beaker" />
          </svg>
          <span className="ms-2">Mode Démo</span>
        </button>
        
        {/* Boosted icons sprite */}
        <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
          <symbol id="icon-beaker" viewBox="0 0 16 16">
            <path d="M5.5 1a.5.5 0 0 0 0 1h.5v1.5a2.5 2.5 0 0 0 .5 1.5l3.5 4.5a2.5 2.5 0 0 1 .5 1.5V14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 1 .5-1.5l3.5-4.5a2.5 2.5 0 0 0 .5-1.5V2h.5a.5.5 0 0 0 0-1h-4z"/>
          </symbol>
          <symbol id="icon-x" viewBox="0 0 16 16">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </symbol>
          <symbol id="icon-check" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </symbol>
          <symbol id="icon-search" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </symbol>
          <symbol id="icon-tag" viewBox="0 0 16 16">
            <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
          </symbol>
          <symbol id="icon-phone" viewBox="0 0 16 16">
            <path d="M11 1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H5z"/>
            <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          </symbol>
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="modal-backdrop fade show" 
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 1040 }}
        />
      )}

      {/* Demo Mode Panel */}
      <div 
        className={`offcanvas offcanvas-end ${isOpen ? 'show' : ''}`}
        tabIndex={-1}
        style={{ 
          zIndex: 1045,
          width: '480px',
          maxWidth: '90vw',
          visibility: isOpen ? 'visible' : 'hidden'
        }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">
            <svg width="24" height="24" fill="currentColor" className="me-2" aria-hidden="true">
              <use xlinkHref="#icon-beaker" />
            </svg>
            Mode Démo
          </h5>
          <button 
            type="button" 
            className="btn-close"
            onClick={() => setIsOpen(false)}
            aria-label="Fermer"
          />
        </div>

        <div className="offcanvas-body">
          {/* Current Scenario Display */}
          {currentScenario && (
            <div className="alert alert-warning mb-3" role="alert">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <h6 className="alert-heading mb-2">
                    <svg width="16" height="16" fill="currentColor" className="me-1" aria-hidden="true">
                      <use xlinkHref="#icon-check" />
                    </svg>
                    Scénario actif
                  </h6>
                  <p className="mb-1 fw-bold">{currentScenario.name}</p>
                  <p className="mb-2 small">{currentScenario.description}</p>
                  <div className="d-flex align-items-center gap-2">
                    <svg width="14" height="14" fill="currentColor" aria-hidden="true">
                      <use xlinkHref="#icon-phone" />
                    </svg>
                    <code className="small">{currentScenario.phoneNumber}</code>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={clearScenario}
                  title="Changer de scénario"
                >
                  Changer
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-3">
            <label htmlFor="demo-search" className="form-label">Rechercher un scénario</label>
            <div className="input-group">
              <span className="input-group-text">
                <svg width="16" height="16" fill="currentColor" aria-hidden="true">
                  <use xlinkHref="#icon-search" />
                </svg>
              </span>
              <input
                id="demo-search"
                type="text"
                className="form-control"
                placeholder="Nom, description ou numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tag Filter */}
          <div className="mb-3">
            <label className="form-label">
              <svg width="16" height="16" fill="currentColor" className="me-1" aria-hidden="true">
                <use xlinkHref="#icon-tag" />
              </svg>
              Filtrer par tag
            </label>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn btn-sm ${!selectedTag ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedTag(null)}
              >
                Tous
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`btn btn-sm ${selectedTag === tag ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Scenarios List */}
          <div className="mb-3">
            <p className="text-muted small mb-2">
              {filteredScenarios.length} scénario{filteredScenarios.length > 1 ? 's' : ''} disponible{filteredScenarios.length > 1 ? 's' : ''}
            </p>
            <div className="list-group">
              {filteredScenarios.map(scenario => (
                <button
                  key={scenario.id}
                  type="button"
                  className={`list-group-item list-group-item-action ${
                    currentScenario?.id === scenario.id ? 'active' : ''
                  }`}
                  onClick={() => handleScenarioSelect(scenario)}
                >
                  <div className="d-flex w-100 justify-content-between align-items-start mb-2">
                    <h6 className="mb-1">{scenario.name}</h6>
                    {currentScenario?.id === scenario.id && (
                      <svg width="16" height="16" fill="currentColor" aria-hidden="true">
                        <use xlinkHref="#icon-check" />
                      </svg>
                    )}
                  </div>
                  <p className="mb-2 small">{scenario.description}</p>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <svg width="14" height="14" fill="currentColor" aria-hidden="true">
                      <use xlinkHref="#icon-phone" />
                    </svg>
                    <code className="small">{scenario.phoneNumber}</code>
                  </div>
                  
                  {/* Characteristics */}
                  <div className="small text-muted">
                    {scenario.characteristics.eligible !== undefined && (
                      <span className="me-3">
                        Éligible: {scenario.characteristics.eligible ? 'Oui' : 'Non'}
                      </span>
                    )}
                    {scenario.characteristics.dormantScore !== undefined && (
                      <span className="me-3">
                        Score: {(scenario.characteristics.dormantScore * 100).toFixed(0)}%
                      </span>
                    )}
                    {scenario.characteristics.estimatedValue !== undefined && (
                      <span className="me-3">
                        Valeur: {scenario.characteristics.estimatedValue}€
                      </span>
                    )}
                  </div>
                  
                  {/* Tags */}
                  <div className="mt-2">
                    {scenario.tags.map(tag => (
                      <span key={tag} className="badge bg-secondary me-1 small">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="offcanvas-footer border-top p-3">
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary flex-grow-1"
              onClick={handleToggleDemoMode}
            >
              <svg width="16" height="16" fill="currentColor" className="me-1" aria-hidden="true">
                <use xlinkHref="#icon-x" />
              </svg>
              Désactiver le mode démo
            </button>
          </div>
        </div>
      </div>

      {/* Floating indicator when demo mode is active */}
      {isDemoMode && !isOpen && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
          <button
            type="button"
            className="btn btn-warning"
            onClick={() => setIsOpen(true)}
            title="Ouvrir le sélecteur de scénario"
          >
            <svg width="20" height="20" fill="currentColor" className="me-1" aria-hidden="true">
              <use xlinkHref="#icon-beaker" />
            </svg>
            {currentScenario ? currentScenario.name : 'Mode Démo'}
          </button>
        </div>
      )}
    </>
  );
}
