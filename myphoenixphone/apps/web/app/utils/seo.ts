import type { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export function generateSEO(config: SEOConfig): Metadata {
  const {
    title,
    description,
    canonical = 'https://myphoenixphone.orange.fr',
    ogImage = '/og-image.png',
    noIndex = false,
  } = config;

  const fullTitle = `${title} | MyPhoenixPhone - Orange`;

  return {
    title: fullTitle,
    description,
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical,
      languages: {
        'fr-FR': canonical,
        'en-GB': `${canonical}/en`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: 'MyPhoenixPhone',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'fr_FR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@orange',
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 5, // Allow zoom for accessibility
    },
    themeColor: '#ff7900', // Orange brand color
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    verification: {
      google: 'verification-code-here', // To be replaced with actual code
    },
  };
}

/**
 * Default SEO configuration for the app
 */
export const defaultSEO: Metadata = generateSEO({
  title: 'Reprise de téléphone',
  description:
    'Donnez une seconde vie à votre ancien téléphone avec Orange. Estimation gratuite en 2 minutes, reprise garantie, geste pour l\'environnement.',
});

/**
 * Page-specific SEO configurations
 */
export const pageSEO = {
  home: generateSEO({
    title: 'Reprise de votre ancien téléphone',
    description:
      'Orange reprend votre ancien smartphone. Obtenez une estimation gratuite en 2 minutes et choisissez votre mode de remise : envoi gratuit ou dépôt en boutique.',
    canonical: 'https://myphoenixphone.orange.fr',
  }),

  eligibility: generateSEO({
    title: 'Vérifiez l\'éligibilité de votre téléphone',
    description:
      'Découvrez si votre appareil est éligible au programme de reprise Orange. Renseignez votre marque et modèle pour une estimation instantanée.',
    canonical: 'https://myphoenixphone.orange.fr/eligibility',
  }),

  estimation: generateSEO({
    title: 'Estimation de votre téléphone',
    description:
      'Obtenez le prix de reprise de votre smartphone en fonction de son état. Estimation gratuite et sans engagement.',
    canonical: 'https://myphoenixphone.orange.fr/lead',
  }),

  ship: generateSEO({
    title: 'Envoi gratuit de votre téléphone',
    description:
      'Téléchargez votre étiquette d\'envoi Colissimo prépayée. Déposez votre colis dans un point relais ou une boîte aux lettres.',
    canonical: 'https://myphoenixphone.orange.fr/ship',
  }),

  store: generateSEO({
    title: 'Dépôt en boutique Orange',
    description:
      'Remettez votre téléphone directement en boutique Orange. Générez votre code QR et présentez-le au conseiller.',
    canonical: 'https://myphoenixphone.orange.fr/store',
  }),

  consent: generateSEO({
    title: 'Gestion des consentements',
    description:
      'Gérez vos préférences de confidentialité et de communication. Orange respecte vos données personnelles conformément au RGPD.',
    canonical: 'https://myphoenixphone.orange.fr/consent',
    noIndex: true,
  }),
};

/**
 * Structured data for rich snippets (JSON-LD)
 */
export function generateStructuredData(type: 'Organization' | 'Product' | 'FAQPage', data?: any) {
  const baseOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Orange',
    url: 'https://www.orange.fr',
    logo: 'https://www.orange.fr/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+33-1-39-26-00-00',
      contactType: 'Customer Service',
      areaServed: 'FR',
      availableLanguage: ['French', 'English'],
    },
  };

  if (type === 'Organization') {
    return baseOrg;
  }

  if (type === 'Product') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Programme de reprise de téléphones - Orange',
      description:
        'Service de reprise et reconditionnement de smartphones par Orange',
      brand: baseOrg,
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        priceCurrency: 'EUR',
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    };
  }

  if (type === 'FAQPage' && data?.questions) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: data.questions.map((q: { question: string; answer: string }) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    };
  }

  return null;
}
