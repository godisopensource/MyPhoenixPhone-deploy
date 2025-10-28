'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useDemo } from "./contexts/DemoContext";
import { 
  ShieldIcon, 
  PhoneIcon, 
  HeartIcon, 
  UsersIcon, 
  CheckCircleIcon,
  WarningIcon,
  SearchIcon,
  BellIcon,
  TruckIcon
} from "./components/solaris-icons";

export default function Home() {
  const router = useRouter();
  const { isDemoMode, setDemoMode, selectScenario } = useDemo();

  const handleNavigateWithScenario = (path: string, scenarioId: string) => {
    selectScenario(scenarioId);
    
    // Close modal programmatically if Bootstrap is loaded
    const modal = document.getElementById('demoNavigationModal');
    if (modal) {
      // Try Bootstrap API first
      if (typeof window !== 'undefined' && (window as any).bootstrap?.Modal) {
        const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      } else {
        // Fallback: manually close modal
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
        
        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        
        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    }
    
    // Navigate
    setTimeout(() => router.push(path), 100);
  };

  return (
    <>
      <header className="bg-dark" role="navigation">
        <div className="container-xxl">
          {/* First line: Logo + Brand */}
          <div className="d-flex align-items-center py-3">
            <Link href="/" className="d-flex align-items-center text-decoration-none">
              <img
                src="https://boosted.orange.com/docs/5.3/assets/brand/orange-logo.svg"
                width={50}
                height={50}
                alt="Orange"
                loading="lazy"
              />
              <span className="ms-3 h4 text-white mb-0">MyPhoenixPhone</span>
            </Link>
          </div>
          
          {/* Separator line */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          
          {/* Second line: Navigation links - smaller text */}
          <nav className="d-flex align-items-center justify-content-between py-2">
            <ul className="nav gap-4 mb-0">
              <li className="nav-item">
                <Link href="/estimation" className="nav-link text-white px-0 py-2" style={{ fontSize: '0.875rem' }}>
                  Estimer mon téléphone
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/verify" className="nav-link text-white px-0 py-2" style={{ fontSize: '0.875rem' }}>
                  Vérifier mon éligibilité
                </Link>
              </li>
              <li className="nav-item">
                <a 
                  href="https://boutique.orange.fr/informations/programme-re/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="nav-link text-white px-0 py-2"
                  style={{ fontSize: '0.875rem' }}
                >
                  Programme RE
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="https://developer.orange.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="nav-link text-white-50 px-0 py-2"
                  style={{ fontSize: '0.875rem' }}
                >
                  API Developer
                </a>
              </li>
            </ul>
            
            <div className="d-flex gap-2 align-items-center">
              <Link 
                href="/estimation" 
                className="text-decoration-none fw-bold"
                style={{ color: '#ff7900', fontSize: '0.875rem' }}
              >
                Commencer →
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section - Two Columns on Dark Background */}
        <section className="py-5 bg-white">
          <div className="container-xxl">
            <div className="bg-dark text-white p-5" style={{ margin: '20px 0' }}>
              <div className="row align-items-center">
                <div className="col-lg-6 mb-4 mb-lg-0">
                  <img
                    src="/media/t-gbmp-global-brand-digital-michaela-content-environment-03-gif-environnement-illus4-telnonutilise-illus4-telnonutilise.gif"
                    alt="Téléphones dormants"
                    className="img-fluid w-100"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="col-lg-6">
                  <h1 className="display-4 fw-bold mb-4">
                    Vos anciens téléphones ont de la valeur
                  </h1>
                  <p className="lead mb-4 text-white-50">
                    MyPhoenixPhone détecte le moment idéal pour vous proposer une reprise personnalisée. 
                    Simple, proactive et sécurisée par les Orange Network APIs.
                  </p>
                  <div className="d-flex gap-3 flex-wrap mb-4">
                    <Link href="/estimation" className="btn btn-primary btn-lg px-4">
                      <PhoneIcon className="me-2" width={20} height={20} />
                      Estimer mon téléphone
                    </Link>
                    <Link href="/verify" className="btn btn-outline-light btn-lg px-4">
                      <ShieldIcon className="me-2" width={20} height={20} />
                      Vérifier mon éligibilité
                    </Link>
                  </div>
                  <div className="d-flex gap-4 small text-white-50">
                    <div className="d-flex align-items-center gap-2">
                      <CheckCircleIcon width={18} height={18} fill="#50be87" />
                      <span>Gratuit et sans engagement</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <CheckCircleIcon width={18} height={18} fill="#50be87" />
                      <span>RGPD compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Statement - Infographic */}
        <section className="py-0 bg-white">
          <div className="container-xxl">
            <div style={{ position: 'relative', height: 420, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: "url('/media/GettyImages-850983940.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.6)'
              }} />

              <div style={{ position: 'relative', zIndex: 2, height: '100%' }} className="d-flex align-items-center justify-content-center text-center px-3">
                <div>
                  <h2 className="display-1 fw-bold mb-3" style={{ lineHeight: 1 }}>
                    <span style={{ color: '#ff7900' }}>30% des smartphones en circulation</span>
                    <div style={{ color: '#fff' }}>sont inutilisés dans le monde.</div>
                  </h2>

                  <p className="h4 fw-semibold mb-2 text-white">Vendez votre ancien téléphone — Orange le rachète jusqu'à <strong>150€ de plus</strong> que sa valeur estimée.</p>

                  <p className="small text-white-50 mt-2 mb-0">MyPhoenixPhone active ce parcours de reprise de façon proactive, simple et sécurisée.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Orange RE Program */}
        <section className="py-5 bg-white">
          <div className="container-xxl">
            <div className="row align-items-stretch">
              <div className="col-lg-6 mb-4 mb-lg-0 d-flex">
                <img
                  src="/media/Orange-Recyclage-Tri-HighRes-11.jpg"
                  alt="Programme RE Orange"
                  className="w-100"
                  style={{ objectFit: 'cover', height: '100%' }}
                />
              </div>
              <div className="col-lg-6 d-flex flex-column">
                <div className="mb-4">
                  <span className="badge bg-success px-3 py-2 mb-3" style={{ fontSize: '14px' }}>
                    <HeartIcon width={16} height={16} className="me-2" />
                    Programme Orange RE
                  </span>
                  <h2 className="h2 fw-bold mb-4">
                    MyPhoenixPhone s'inscrit dans la continuité du programme RE
                  </h2>
                  <p className="mb-4" style={{ color: '#000' }}>
                    Orange s'engage pour une consommation plus responsable avec le programme RE 
                    (Reprise, Reconditionnement, Recyclage). MyPhoenixPhone utilise les 
                    <strong> Orange Network APIs</strong> pour rendre ce programme encore plus efficace 
                    et proactif.
                  </p>
                </div>
                
                <div className="row g-3">
                  <div className="col-12">
                    <div className="d-flex gap-3 align-items-start">
                      <CheckCircleIcon width={24} height={24} fill="#50be87" className="flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="h6 fw-bold mb-1">Détection intelligente</h3>
                        <p className="small mb-0" style={{ color: '#000' }}>
                          Les Network APIs détectent automatiquement les changements de mobile, 
                          lignes inactives ou changements de SIM pour identifier le moment idéal.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex gap-3 align-items-start">
                      <CheckCircleIcon width={24} height={24} fill="#50be87" className="flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="h6 fw-bold mb-1">Contact proactif</h3>
                        <p className="small mb-0" style={{ color: '#000' }}>
                          Plus besoin d'attendre la bonne volonté du client : nous le contactons 
                          au moment opportun avec une offre personnalisée.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex gap-3 align-items-start">
                      <CheckCircleIcon width={24} height={24} fill="#50be87" className="flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="h6 fw-bold mb-1">Impact amplifié</h3>
                        <p className="small mb-0" style={{ color: '#000' }}>
                          En multipliant les reprises, nous augmentons le taux de reconditionnement 
                          et réduisons les déchets électroniques.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <a 
                    href="https://boutique.orange.fr/informations/programme-re/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary"
                  >
                    En savoir plus sur le programme RE
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition - Timeline */}
        <section className="py-5" style={{ backgroundColor: '#f8f9fa' }}>
          <div className="container-xxl">
            <div className="text-center mb-4">
              <h2 className="h2 fw-bold mb-3">
                Un service qui crée de la valeur à chaque étape
              </h2>
              <p className="lead text-muted">
                De la détection à la livraison, nous vous accompagnons dans tout le parcours
              </p>
            </div>
            
            {/* Timeline */}
            <div className="position-relative" style={{ maxWidth: '900px', margin: '0 auto' }}>
              {/* Timeline Line */}
              <div className="position-absolute" style={{ left: '50%', top: 0, bottom: 0, width: '4px', backgroundColor: '#ff7900', transform: 'translateX(-50%)', zIndex: 0 }} />

              {/* Step 1: Detection */}
              <div className="row mb-3 position-relative" style={{ zIndex: 1 }}>
                <div className="timeline-icon" style={{ position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)', top: '20%', width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ff7900', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <SearchIcon width={32} height={32} fill="white" />
                </div>
                <div className="col-md-6 text-md-end pe-md-5">
                  <div className="bg-white p-4 shadow-sm">
                    <h3 className="h5 fw-bold mb-3">1. Détection proactive</h3>
                    <p className="text-muted mb-0">Les Network APIs détectent automatiquement le moment idéal : changement de mobile, ligne inactive, SIM swap récent...</p>
                  </div>
                </div>
                <div className="col-md-6 d-flex align-items-center justify-content-start ps-md-5" style={{ visibility: 'hidden' }}>
                  <div className="d-flex align-items-center justify-content-center bg-primary" style={{ width: '80px', height: '80px', minWidth: '80px' }}>
                    <SearchIcon width={40} height={40} fill="white" />
                  </div>
                </div>
              </div>

              {/* Step 2: Contact with SMS - Inversé */}
              <div className="row mb-3 position-relative" style={{ zIndex: 1 }}>
                <div className="timeline-icon" style={{ position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)', top: '40%', width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ff7900', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <BellIcon width={32} height={32} fill="white" />
                </div>
                <div className="col-md-6 order-md-2 ps-md-5">
                  <div className="bg-white p-4 shadow-sm">
                    <h3 className="h5 fw-bold mb-3">2. Message personnalisé</h3>
                    <p className="text-muted mb-3">Nous envoyons un SMS avec une estimation adaptée à votre situation</p>

                    {/* SMS Mockup intégré - rounded bubble with small tail */}
                    <div style={{ position: 'relative', display: 'inline-block', paddingBottom: '10px' }}>
                      <div className="bg-light p-3" style={{ border: '2px solid #e0e0e0', borderRadius: 14, maxWidth: 340 }}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div style={{ width: 36, height: 36, background: '#ff7900', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 'bold', borderRadius: 8 }}>📱</div>
                          <div>
                            <div className="fw-bold" style={{ fontSize: '12px' }}>Orange</div>
                            <div className="text-muted" style={{ fontSize: '10px' }}>À l'instant</div>
                          </div>
                        </div>
                        <div className="bg-white p-3" style={{ fontSize: '13px', borderRadius: 12, boxShadow: '0 6px 14px rgba(0,0,0,0.06)' }}>
                          <p className="mb-1">Bonjour Paul !</p>
                          <p className="mb-0">Votre ancien iPhone pourrait valoir jusqu'à <strong style={{ color: '#ff7900' }}>245€</strong>. Intéressé ?</p>
                        </div>
                      </div>
                      {/* Tail positioned below and outside the bubble */}
                      <div style={{ 
                        position: 'absolute', 
                        left: 20, 
                        bottom: 3,
                        width: 0, 
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid #e0e0e0'
                      }} />
                    </div>

                  </div>
                </div>
                <div className="col-md-6 order-md-1 d-flex align-items-center justify-content-end pe-md-5" style={{ visibility: 'hidden' }}>
                  <div className="d-flex align-items-center justify-content-center bg-primary" style={{ width: '80px', height: '80px', minWidth: '80px' }}>
                    <BellIcon width={40} height={40} fill="white" />
                  </div>
                </div>
              </div>

              {/* Step 3: Evaluation */}
              <div className="row mb-3 position-relative" style={{ zIndex: 1 }}>
                <div className="timeline-icon" style={{ position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)', top: '60%', width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ff7900', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <PhoneIcon width={32} height={32} fill="white" />
                </div>
                <div className="col-md-6 text-md-end pe-md-5">
                  <div className="bg-white p-4 shadow-sm">
                    <h3 className="h5 fw-bold mb-3">3. Évaluation simplifiée</h3>
                    <p className="text-muted mb-0">Quelques clics suffisent pour obtenir une offre de reprise, de reconditionnement ou de don</p>
                  </div>
                </div>
                <div className="col-md-6 d-flex align-items-center justify-content-start ps-md-5" style={{ visibility: 'hidden' }}>
                  <div className="d-flex align-items-center justify-content-center bg-primary" style={{ width: '80px', height: '80px', minWidth: '80px' }}>
                    <PhoneIcon width={40} height={40} fill="white" />
                  </div>
                </div>
              </div>

              {/* Step 4: Delivery */}
              <div className="row position-relative" style={{ zIndex: 1 }}>
                <div className="timeline-icon" style={{ position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)', top: '80%', width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ff7900', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <TruckIcon width={32} height={32} fill="white" />
                </div>
                <div className="col-md-6 order-md-2 ps-md-5">
                  <div className="bg-white p-4 shadow-sm">
                    <h3 className="h5 fw-bold mb-3">4. Livraison & paiement</h3>
                    <p className="text-muted mb-0">Nous organisons la collecte avec une enveloppe prépayée. Vous recevez votre paiement ou confirmation de don rapidement.</p>
                  </div>
                </div>
                <div className="col-md-6 order-md-1 d-flex align-items-center justify-content-end pe-md-5" style={{ visibility: 'hidden' }}>
                  <div className="d-flex align-items-center justify-content-center bg-primary" style={{ width: '80px', height: '80px', minWidth: '80px' }}>
                    <TruckIcon width={40} height={40} fill="white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid - grouped into a dark container like the hero */}
            <div className="bg-dark text-white p-5" style={{ marginTop: '3rem' }}>
              <div className="row g-4 mb-4">
                {/* Feature 1 */}
                <div className="col-lg-4">
                  <div className="h-100">
                    <div className="d-flex align-items-start gap-3">
                      <div className="d-inline-flex align-items-center justify-content-center flex-shrink-0" 
                           style={{ width: '50px', height: '50px', border: '2px solid #ff7900', backgroundColor: 'transparent', borderRadius: '50%' }}>
                        <ShieldIcon width={24} height={24} fill="#ff7900" />
                      </div>
                      <div>
                        <h3 className="h5 fw-bold mb-2 text-white">Technologies CAMARA</h3>
                        <p className="small mb-0 text-white-50">
                          Sécurisé par les Orange Network APIs : vérification du numéro, 
                          détection SIM swap, analyse de connectivité...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="col-lg-4">
                  <div className="h-100">
                    <div className="d-flex align-items-start gap-3">
                      <div className="d-inline-flex align-items-center justify-content-center flex-shrink-0" 
                           style={{ width: '50px', height: '50px', border: '2px solid #ff7900', backgroundColor: 'transparent', borderRadius: '50%' }}>
                        <HeartIcon width={24} height={24} fill="#ff7900" />
                      </div>
                      <div>
                        <h3 className="h5 fw-bold mb-2 text-white">Reprise, reconditionnement ou don</h3>
                        <p className="small mb-0 text-white-50">
                          Selon l'état et votre préférence : rachat avec paiement, 
                          reconditionnement solidaire, ou don à une association
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="col-lg-4">
                  <div className="h-100">
                    <div className="d-flex align-items-start gap-3">
                      <div className="d-inline-flex align-items-center justify-content-center flex-shrink-0" 
                           style={{ width: '50px', height: '50px', border: '2px solid #ff7900', backgroundColor: 'transparent', borderRadius: '50%' }}>
                        <PhoneIcon width={24} height={24} fill="#ff7900" />
                      </div>
                      <div>
                        <h3 className="h5 fw-bold mb-2 text-white">Accompagnement complet</h3>
                        <p className="small mb-0 text-white-50">
                          De l'estimation à la livraison : enveloppe prépayée fournie, 
                          suivi en temps réel, paiement rapide
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA inside dark block */}
              <div className="text-center mt-4">
                <Link href="/estimation" className="btn btn-outline-light btn-lg px-5 py-3">
                  Découvrir la valeur de mon téléphone
                </Link>
                <p className="text-white-50 small mt-3 mb-0">
                  Gratuit, sans engagement, et conforme RGPD
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-5 bg-white">
          <div className="container-xxl">
            <div className="row align-items-center">
              <div className="col-lg-6 order-lg-2 mb-4 mb-lg-0">
                <img
                  src="/media/Antenne-5G-20-HD.jpg"
                  alt="Réseau Orange 5G"
                  className="img-fluid w-100"
                  style={{ objectFit: 'cover', maxHeight: '500px' }}
                />
              </div>
              <div className="col-lg-6 order-lg-1">
                <span className="badge text-bg-primary px-3 py-2 mb-3" style={{ fontSize: '14px' }}>
                  Technologie Orange Network APIs
                </span>
                <h2 className="h2 fw-bold mb-4">
                  La puissance du réseau au service de l'économie circulaire
                </h2>
                <p className="mb-4">
                  MyPhoenixPhone exploite les <strong>Orange Network APIs (CAMARA)</strong> 
                  pour détecter intelligemment les opportunités de reprise. Ces APIs permettent 
                  d'analyser en temps réel les données réseau tout en respectant la vie privée des utilisateurs.
                </p>
                
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-2">
                      <CheckCircleIcon width={20} height={20} fill="#ff7900" className="flex-shrink-0 mt-1" />
                      <div>
                        <strong className="d-block mb-1">Number Verification</strong>
                        <small className="text-muted">Authentification sans OTP</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-2">
                      <CheckCircleIcon width={20} height={20} fill="#ff7900" className="flex-shrink-0 mt-1" />
                      <div>
                        <strong className="d-block mb-1">SIM Swap Detection</strong>
                        <small className="text-muted">Détection changement SIM</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-2">
                      <CheckCircleIcon width={20} height={20} fill="#ff7900" className="flex-shrink-0 mt-1" />
                      <div>
                        <strong className="d-block mb-1">Device Status</strong>
                        <small className="text-muted">État de connectivité</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-start gap-2">
                      <CheckCircleIcon width={20} height={20} fill="#ff7900" className="flex-shrink-0 mt-1" />
                      <div>
                        <strong className="d-block mb-1">Roaming Status</strong>
                        <small className="text-muted">Statut d'itinérance</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-3 align-items-start p-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <ShieldIcon width={32} height={32} fill="#ff7900" className="flex-shrink-0" />
                  <div>
                    <h3 className="h6 fw-bold mb-2">Sécurité et confidentialité</h3>
                    <p className="small text-muted mb-0">
                      Toutes les données sont traitées conformément au RGPD. 
                      Les APIs utilisent des mécanismes de consentement explicite et 
                      ne partagent aucune donnée personnelle sans autorisation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white">
        <div className="container-xxl">
          {/* Main footer content */}
          <div className="row py-5">
            <div className="col-md-3 mb-4 mb-md-0">
              <h3 className="h6 fw-bold mb-3">MyPhoenixPhone</h3>
              <p className="small text-white-50">
                Le service intelligent de reprise mobile propulsé par Orange Network APIs.
              </p>
            </div>
            <div className="col-md-3 mb-4 mb-md-0">
              <h3 className="h6 fw-bold mb-3">Services</h3>
              <ul className="list-unstyled small">
                <li className="mb-2">
                  <Link href="/estimation" className="text-white-50 text-decoration-none">
                    Estimation de reprise
                  </Link>
                </li>
                <li className="mb-2">
                  <Link href="/verify" className="text-white-50 text-decoration-none">
                    Vérification d'éligibilité
                  </Link>
                </li>
                <li className="mb-2">
                  <a href="https://boutique.orange.fr/informations/programme-re/" target="_blank" rel="noopener noreferrer" className="text-white-50 text-decoration-none">
                    Programme RE
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-md-3 mb-4 mb-md-0">
              <h3 className="h6 fw-bold mb-3">Orange</h3>
              <ul className="list-unstyled small">
                <li className="mb-2">
                  <a href="https://www.orange.fr" target="_blank" rel="noopener noreferrer" className="text-white-50 text-decoration-none">
                    Orange.fr
                  </a>
                </li>
                <li className="mb-2">
                  <a href="https://developer.orange.com" target="_blank" rel="noopener noreferrer" className="text-white-50 text-decoration-none">
                    Orange Developer
                  </a>
                </li>
                <li className="mb-2">
                  <a href="https://www.camaraproject.org" target="_blank" rel="noopener noreferrer" className="text-white-50 text-decoration-none">
                    CAMARA Project
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-md-3">
              <h3 className="h6 fw-bold mb-3">Informations légales</h3>
              <ul className="list-unstyled small">
                <li className="mb-2">
                  <a href="#" className="text-white-50 text-decoration-none">
                    Mentions légales
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-white-50 text-decoration-none">
                    Politique de confidentialité
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#" className="text-white-50 text-decoration-none">
                    Gestion des cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-top border-secondary py-4">
            <div className="row align-items-center">
              <div className="col-md-6 mb-3 mb-md-0">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src="https://boosted.orange.com/docs/5.3/assets/brand/orange-logo.svg"
                    width={40}
                    height={40}
                    alt="Orange"
                  />
                  <span className="small text-white-50">
                    © 2025 Orange. Tous droits réservés.
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex gap-3 justify-content-md-end">
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Accessibilité
                  </a>
                  <span className="text-white-50">|</span>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Plan du site
                  </a>
                  <span className="text-white-50">|</span>
                  <a href="#" className="text-white-50 text-decoration-none small">
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Navigation Modal */}
      <div className="modal fade" id="demoNavigationModal" tabIndex={-1} aria-labelledby="demoNavigationModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title h5" id="demoNavigationModalLabel">
                <i className="bi bi-play-circle me-2" style={{ color: '#ff7900' }}></i>
                Mode Démonstration
              </h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Close">
                <span className="visually-hidden">Close</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted mb-4">
                Découvrez les différentes fonctionnalités de MyPhoenixPhone avec des scénarios de démonstration pré-configurés.
              </p>
              
              <div className="list-group list-group-flush">
                <button
                  type="button"
                  className="list-group-item list-group-item-action d-flex align-items-start text-start"
                  onClick={() => handleNavigateWithScenario('/verify', 'perfect-candidate')}
                >
                  <div className="me-3 mt-1">
                    <ShieldIcon width={24} height={24} fill="#ff7900" />
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">Vérifier l'éligibilité d'un client</h6>
                    <p className="mb-0 small text-muted">
                      Utilisez le scénario "Candidat Parfait" (+33699901001) pour tester la vérification par SMS. Les APIs CAMARA détectent un téléphone dormant éligible au programme de rachat.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="list-group-item list-group-item-action d-flex align-items-start text-start"
                  onClick={() => handleNavigateWithScenario('/estimation', 'with-pricing')}
                >
                  <div className="me-3 mt-1">
                    <PhoneIcon width={24} height={24} fill="#ff7900" />
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">Estimer la reprise d'un appareil</h6>
                    <p className="mb-0 small text-muted">
                      Pré-remplissage avec "iPhone 13 Pro Max 256GB en excellent état". Découvrez le calcul de la valeur de reprise basé sur le modèle, l'état et les prix du marché.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  className="list-group-item list-group-item-action d-flex align-items-start text-start"
                  onClick={() => handleNavigateWithScenario('/admin', 'in-campaign')}
                >
                  <div className="me-3 mt-1">
                    <UsersIcon width={24} height={24} fill="#ff7900" />
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">Piloter les campagnes de rachat</h6>
                    <p className="mb-0 small text-muted">
                      Consultez les métriques réelles issues du seed : leads détectés via Network APIs, taux de conversion, valeur moyenne par appareil. Gérez les campagnes SMS de sensibilisation.
                    </p>
                  </div>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Demo Mode Button */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
        {isDemoMode ? (
          <button
            type="button"
            className="btn btn-warning btn-lg"
            onClick={() => setDemoMode(false)}
            title="Quitter le mode démo"
          >
            <i className="bi bi-x-circle me-2"></i>
            <span>Quitter le mode démo</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-warning btn-lg"
            data-bs-toggle="modal"
            data-bs-target="#demoNavigationModal"
            title="Activer le mode démo"
          >
            <i className="bi bi-play-circle me-2"></i>
            <span>Mode Démo</span>
          </button>
        )}
      </div>
    </>
  );
}
