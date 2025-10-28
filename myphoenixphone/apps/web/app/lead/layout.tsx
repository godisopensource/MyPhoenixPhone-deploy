import type { Metadata } from 'next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

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
      <Header />
      <div className="flex-grow-1 bg-white">
        {children}
      </div>
      <Footer />
    </div>
  );
}
