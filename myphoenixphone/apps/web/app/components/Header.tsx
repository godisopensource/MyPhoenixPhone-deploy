'use client';

import Link from 'next/link';

export function Header() {
  return (
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
  );
}
