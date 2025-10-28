'use client';

import Link from 'next/link';

export function Footer() {
  return (
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
  );
}
