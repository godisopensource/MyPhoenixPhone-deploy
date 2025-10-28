'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DemoScenario {
  id: string;
  name: string;
  phoneNumber: string;
  description: string;
  characteristics: {
    dormantScore?: number;
    eligible?: boolean;
    simSwapDays?: number;
    reachable?: boolean;
    deviceModel?: string;
    estimatedValue?: number;
    hasConsent?: boolean;
    hasVerification?: boolean;
    hasPricing?: boolean;
    handoverChoice?: string;
    optedOut?: boolean;
    contactCount?: number;
  };
  tags: string[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'perfect-candidate',
    name: 'Candidat Parfait',
    phoneNumber: '+33699901001',
    description: 'Téléphone dormant haute valeur (SIM swap 60j, NOT_CONNECTED) - ÉLIGIBLE',
    characteristics: {
      dormantScore: 0.95,
      eligible: true,
      simSwapDays: 60,
      reachable: false,
      deviceModel: 'iPhone 13 Pro Max',
      estimatedValue: 450,
    },
    tags: ['high-value', 'dormant', 'eligible'],
  },
  {
    id: 'recent-sim-swap',
    name: 'SIM Swap Trop Récent',
    phoneNumber: '+33699901002',
    description: 'SIM swap 8j + CONNECTED_SMS - hors fenêtre (<30j)',
    characteristics: {
      dormantScore: 0.40,
      eligible: false,
      simSwapDays: 8,
      reachable: true,
      deviceModel: 'Samsung Galaxy S22',
      estimatedValue: 320,
    },
    tags: ['recent-swap', 'not-eligible', 'too-recent'],
  },
  {
    id: 'too-recent-swap',
    name: 'Utilisateur Actif',
    phoneNumber: '+33699901003',
    description: 'SIM swap 3j + CONNECTED_DATA - utilisateur très actif',
    characteristics: {
      dormantScore: 0.15,
      eligible: false,
      simSwapDays: 3,
      reachable: true,
      deviceModel: 'Google Pixel 7',
      estimatedValue: 340,
    },
    tags: ['active', 'not-eligible', 'too-recent'],
  },
  {
    id: 'expired-swap',
    name: 'SIM Swap Expiré',
    phoneNumber: '+33699901004',
    description: 'SIM swap 428j (>90j) + CONNECTED_SMS - hors fenêtre',
    characteristics: {
      dormantScore: 0.25,
      eligible: false,
      simSwapDays: 428,
      reachable: true,
      deviceModel: 'OnePlus 9 Pro',
      estimatedValue: 290,
    },
    tags: ['expired', 'not-eligible', 'too-old'],
  },
  {
    id: 'old-swap-reachable',
    name: 'Ancien + Actif',
    phoneNumber: '+33699901005',
    description: 'SIM swap 398j + CONNECTED_SMS - ancien et actif',
    characteristics: {
      dormantScore: 0.30,
      eligible: false,
      simSwapDays: 398,
      reachable: true,
      deviceModel: 'Xiaomi Mi 11',
      estimatedValue: 260,
    },
    tags: ['old', 'active', 'not-eligible'],
  },
  {
    id: 'very-old-swap',
    name: 'Très Ancien',
    phoneNumber: '+33699901006',
    description: 'SIM swap 640j + CONNECTED_DATA - bien trop ancien',
    characteristics: {
      dormantScore: 0.10,
      eligible: false,
      simSwapDays: 640,
      reachable: true,
      deviceModel: 'Samsung Galaxy A51',
      estimatedValue: 85,
    },
    tags: ['very-old', 'active', 'not-eligible'],
  },
  {
    id: 'with-pricing',
    name: 'Test Estimation',
    phoneNumber: '+33699901007',
    description: 'SIM swap 489j + CONNECTED_SMS - pour démo estimation prix',
    characteristics: {
      dormantScore: 0.20,
      eligible: false,
      simSwapDays: 489,
      reachable: true,
      deviceModel: 'iPhone 14 Pro',
      estimatedValue: 680,
      hasPricing: true,
    },
    tags: ['pricing', 'high-value', 'not-eligible'],
  },
  {
    id: 'old-samsung',
    name: 'Samsung Ancien',
    phoneNumber: '+33699901008',
    description: 'SIM swap 458j + CONNECTED_SMS - ancien Samsung',
    characteristics: {
      dormantScore: 0.18,
      eligible: false,
      simSwapDays: 458,
      reachable: true,
      deviceModel: 'Samsung Galaxy S21',
      estimatedValue: 350,
    },
    tags: ['old', 'samsung', 'not-eligible'],
  },
  {
    id: 'very-old-device',
    name: 'Appareil Très Ancien',
    phoneNumber: '+33699901009',
    description: 'SIM swap 519j + CONNECTED_SMS - très ancien appareil',
    characteristics: {
      dormantScore: 0.12,
      eligible: false,
      simSwapDays: 519,
      reachable: true,
      deviceModel: 'Huawei P30',
      estimatedValue: 180,
    },
    tags: ['very-old', 'not-eligible'],
  },
  {
    id: 'in-campaign',
    name: 'Test Dashboard Admin',
    phoneNumber: '+33699901010',
    description: 'SIM swap 610j + CONNECTED_DATA - pour test dashboard',
    characteristics: {
      dormantScore: 0.08,
      eligible: false,
      simSwapDays: 610,
      reachable: true,
      deviceModel: 'iPhone 11',
      estimatedValue: 280,
      contactCount: 1,
    },
    tags: ['campaign', 'not-eligible', 'very-old'],
  },
];

interface DemoContextType {
  isDemoMode: boolean;
  currentScenario: DemoScenario | null;
  setDemoMode: (enabled: boolean) => void;
  selectScenario: (scenarioId: string) => void;
  clearScenario: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<DemoScenario | null>(null);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (!enabled) {
      setCurrentScenario(null);
    }
  };

  const selectScenario = (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      setCurrentScenario(scenario);
      setIsDemoMode(true);
    }
  };

  const clearScenario = () => {
    setCurrentScenario(null);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        currentScenario,
        setDemoMode,
        selectScenario,
        clearScenario,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
