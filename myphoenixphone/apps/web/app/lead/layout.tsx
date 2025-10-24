import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valorisation de votre téléphone - Orange',
  description: 'Obtenez une estimation gratuite de la valeur de reprise de votre ancien téléphone',
};

export default function LeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Orange Header */}
      <header className="navbar navbar-dark bg-dark" role="navigation">
        <div className="container-xxl">
          <div className="navbar-brand">
            <a className="stretched-link" href="https://www.orange.fr">
              <img 
                src="https://boosted.orange.com/docs/5.3/assets/brand/orange-logo.svg" 
                width="50" 
                height="50" 
                alt="Orange" 
                loading="lazy"
              />
            </a>
            <span className="ms-3 h5 text-white mb-0">Reprise téléphone</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow-1 bg-light">
        {children}
      </div>

      {/* Orange Footer */}
      <footer className="footer bg-dark py-4">
        <div className="container-xxl">
          <div className="row">
            <div className="col-md-6">
              <p className="mb-2 text-white-50">
                <small>
                  Service proposé par Orange France<br />
                  Questions ? Contactez le 3900 (service gratuit + prix d'un appel)
                </small>
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <ul className="list-inline mb-0">
                <li className="list-inline-item">
                  <a href="/privacy" className="text-white-50 text-decoration-none">
                    <small>Données personnelles</small>
                  </a>
                </li>
                <li className="list-inline-item ms-3">
                  <a href="/legal" className="text-white-50 text-decoration-none">
                    <small>Mentions légales</small>
                  </a>
                </li>
                <li className="list-inline-item ms-3">
                  <a href="/cgu" className="text-white-50 text-decoration-none">
                    <small>CGU</small>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-12 text-center">
              <p className="mb-0 text-white-50">
                <small>© {new Date().getFullYear()} Orange SA - Tous droits réservés</small>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
