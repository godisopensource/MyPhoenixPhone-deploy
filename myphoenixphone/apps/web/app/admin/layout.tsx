import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoIcon, ShopIcon, CheckIcon, PrintIcon, UserIcon, BellIcon } from '../components/solaris-icons';
import { AdminDemoBootstrap } from './AdminDemoBootstrap';

export const metadata: Metadata = {
  title: 'Admin - Gestion des Campagnes - Orange',
  description: 'Interface administrateur pour gérer les campagnes de valorisation',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-vh-100 d-flex">
      {/* Sidebar Navigation */}
      <nav className="bg-dark text-white" style={{ width: '250px', minHeight: '100vh' }}>
        <div className="p-4">
          <div className="d-flex align-items-center mb-4">
            <img 
              src="https://boosted.orange.com/docs/5.3/assets/brand/orange-logo.svg" 
              width="40" 
              height="40" 
              alt="Orange" 
              className="me-2"
            />
            <div>
              <div className="fw-bold">MyPhoenixPhone</div>
              <small className="text-white-50">Admin</small>
            </div>
          </div>

          <hr className="border-white-50" />

          {/* Navigation Menu */}
          <ul className="nav nav-pills flex-column">
            <li className="nav-item mb-2">
              <Link 
                href="/admin" 
                className="nav-link text-white d-flex align-items-center"
              >
                <InfoIcon className="me-2" width={20} height={20} />
                Dashboard
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link 
                href="/admin/campaigns" 
                className="nav-link text-white active d-flex align-items-center"
                style={{ backgroundColor: '#ff7900' }}
              >
                <ShopIcon className="me-2" width={20} height={20} />
                Campagnes
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link 
                href="/admin/leads" 
                className="nav-link text-white d-flex align-items-center"
              >
                <UserIcon className="me-2" width={20} height={20} />
                Leads
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link 
                href="/admin/templates" 
                className="nav-link text-white d-flex align-items-center"
              >
                <PrintIcon className="me-2" width={20} height={20} />
                Templates
              </Link>
            </li>
          </ul>

          <hr className="border-white-50 mt-4" />

          {/* User Info */}
          <div className="mt-4">
            <div className="d-flex align-items-center text-white-50">
              <UserIcon className="me-2" width={16} height={16} />
              <small>Admin User</small>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow-1 bg-white">
        {/* Top Bar */}
        <header className="bg-white border-bottom py-3 px-4">
              <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Gestion des Campagnes</h5>
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-sm btn-outline-secondary">
                <BellIcon width={16} height={16} />
              </button>
              <span className="text-muted">|</span>
              <a href="/" className="btn btn-sm btn-outline-primary">
                Voir le site
              </a>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4">
          {/* Ensure demo mode is enabled client-side across all admin pages */}
          <AdminDemoBootstrap />
          {children}
        </main>
      </div>
    </div>
  );
}
