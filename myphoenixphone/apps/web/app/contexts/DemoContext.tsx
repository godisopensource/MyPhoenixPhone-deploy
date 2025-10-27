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
    name: 'Perfect Candidate',
    phoneNumber: '+33699901001',
    description: 'High-value dormant device - ideal buyback candidate',
    characteristics: {
      dormantScore: 0.95,
      eligible: true,
      simSwapDays: 45,
      reachable: false,
      deviceModel: 'iPhone 13 Pro Max',
      estimatedValue: 450,
    },
    tags: ['high-value', 'dormant', 'eligible'],
  },
  {
    id: 'recent-sim-swap',
    name: 'Recent SIM Swap',
    phoneNumber: '+33699901002',
    description: 'SIM swap 7 days ago - potential device abandonment',
    characteristics: {
      dormantScore: 0.75,
      eligible: true,
      simSwapDays: 7,
      reachable: false,
      deviceModel: 'Samsung Galaxy S22',
      estimatedValue: 320,
    },
    tags: ['recent-swap', 'eligible', 'hold'],
  },
  {
    id: 'old-swap-unreachable',
    name: 'Old Swap + Unreachable',
    phoneNumber: '+33699901003',
    description: 'SIM swap 120 days ago, device unreachable',
    characteristics: {
      dormantScore: 0.88,
      eligible: true,
      simSwapDays: 120,
      reachable: false,
      deviceModel: 'iPhone 12',
      estimatedValue: 380,
    },
    tags: ['dormant', 'expiring', 'eligible'],
  },
  {
    id: 'active-user',
    name: 'Active User',
    phoneNumber: '+33699901004',
    description: 'Device still connected - not eligible for buyback',
    characteristics: {
      dormantScore: 0.15,
      eligible: false,
      simSwapDays: undefined,
      reachable: true,
      deviceModel: undefined,
      estimatedValue: undefined,
    },
    tags: ['active', 'not-eligible', 'excluded'],
  },
  {
    id: 'with-consent',
    name: 'Consent Given',
    phoneNumber: '+33699901005',
    description: 'User already provided OAuth2 consent',
    characteristics: {
      dormantScore: 0.82,
      eligible: true,
      simSwapDays: 30,
      reachable: false,
      deviceModel: 'Google Pixel 7',
      estimatedValue: 340,
      hasConsent: true,
    },
    tags: ['consent', 'eligible', 'dormant'],
  },
  {
    id: 'verified-user',
    name: 'SMS Verified',
    phoneNumber: '+33699901006',
    description: 'User completed SMS verification',
    characteristics: {
      dormantScore: 0.79,
      eligible: true,
      simSwapDays: 25,
      reachable: false,
      deviceModel: 'OnePlus 9 Pro',
      estimatedValue: 290,
      hasVerification: true,
    },
    tags: ['verified', 'eligible', 'dormant'],
  },
  {
    id: 'with-pricing',
    name: 'Pricing Estimate',
    phoneNumber: '+33699901007',
    description: 'User received device valuation',
    characteristics: {
      dormantScore: 0.91,
      eligible: true,
      simSwapDays: 50,
      reachable: false,
      deviceModel: 'iPhone 14 Pro',
      estimatedValue: 680,
      hasPricing: true,
    },
    tags: ['pricing', 'high-value', 'eligible'],
  },
  {
    id: 'with-handover',
    name: 'Handover Selected',
    phoneNumber: '+33699901008',
    description: 'User chose shipping method',
    characteristics: {
      dormantScore: 0.93,
      eligible: true,
      simSwapDays: 60,
      reachable: false,
      deviceModel: 'Samsung Galaxy S23 Ultra',
      estimatedValue: 750,
      handoverChoice: 'ship',
    },
    tags: ['converted', 'high-value', 'handover'],
  },
  {
    id: 'opted-out',
    name: 'Opted Out',
    phoneNumber: '+33699901009',
    description: 'User requested no contact (GDPR)',
    characteristics: {
      dormantScore: undefined,
      eligible: false,
      simSwapDays: 40,
      reachable: false,
      optedOut: true,
    },
    tags: ['opted-out', 'gdpr', 'excluded'],
  },
  {
    id: 'in-campaign',
    name: 'In Campaign',
    phoneNumber: '+33699901010',
    description: 'Received SMS nudge 2 days ago',
    characteristics: {
      dormantScore: 0.86,
      eligible: true,
      simSwapDays: 35,
      reachable: false,
      deviceModel: 'iPhone 11',
      estimatedValue: 280,
      contactCount: 1,
    },
    tags: ['campaign', 'nudge', 'eligible'],
  },
  {
    id: 'multi-contact',
    name: 'Multiple Contacts',
    phoneNumber: '+33699901011',
    description: 'Received 4 contact attempts (SMS, email)',
    characteristics: {
      dormantScore: 0.89,
      eligible: true,
      simSwapDays: 55,
      reachable: false,
      deviceModel: 'Xiaomi Mi 11',
      estimatedValue: 260,
      contactCount: 4,
    },
    tags: ['multi-channel', 'engaged', 'eligible'],
  },
  {
    id: 'premium-iphone',
    name: 'Premium iPhone',
    phoneNumber: '+33699901012',
    description: 'iPhone 15 Pro Max in excellent condition',
    characteristics: {
      dormantScore: 0.84,
      eligible: true,
      simSwapDays: 20,
      reachable: false,
      deviceModel: 'iPhone 15 Pro Max',
      estimatedValue: 950,
    },
    tags: ['premium', 'high-value', 'iphone'],
  },
  {
    id: 'old-android',
    name: 'Low Value Android',
    phoneNumber: '+33699901013',
    description: 'Samsung Galaxy A51 - low buyback value',
    characteristics: {
      dormantScore: 0.96,
      eligible: true,
      simSwapDays: 180,
      reachable: false,
      deviceModel: 'Samsung Galaxy A51',
      estimatedValue: 85,
    },
    tags: ['low-value', 'old', 'expired'],
  },
  {
    id: 'high-value-cohort',
    name: 'High-Value Cohort',
    phoneNumber: '+33699901014',
    description: 'Member of premium device cohort (>400€)',
    characteristics: {
      dormantScore: 0.92,
      eligible: true,
      simSwapDays: 42,
      reachable: false,
      deviceModel: 'iPhone 13',
      estimatedValue: 520,
    },
    tags: ['cohort', 'high-value', 'segmented'],
  },
  {
    id: 'rate-limit-test',
    name: 'Rate Limit Test',
    phoneNumber: '+33699901015',
    description: 'For testing API rate limiting',
    characteristics: {
      dormantScore: 0.70,
      eligible: true,
    },
    tags: ['test', 'rate-limit'],
  },
  {
    id: 'network-error',
    name: 'Network Error',
    phoneNumber: '+33699901016',
    description: 'Simulates network API errors',
    characteristics: {
      dormantScore: undefined,
      eligible: false,
    },
    tags: ['test', 'error', 'network'],
  },
  {
    id: 'swap-yesterday',
    name: 'Fresh SIM Swap',
    phoneNumber: '+33699901017',
    description: 'SIM swap detected yesterday',
    characteristics: {
      dormantScore: 0.65,
      eligible: true,
      simSwapDays: 1,
      reachable: false,
    },
    tags: ['fresh-swap', 'recent', 'eligible'],
  },
  {
    id: 'reachable-no-swap',
    name: 'Reachable No Swap',
    phoneNumber: '+33699901018',
    description: 'Device reachable, no SIM swap data',
    characteristics: {
      dormantScore: 0.40,
      eligible: false,
      simSwapDays: undefined,
      reachable: true,
    },
    tags: ['reachable', 'no-swap', 'not-eligible'],
  },
  {
    id: 'multi-channel',
    name: 'Multi-Channel',
    phoneNumber: '+33699901019',
    description: 'Interactions via SMS, email, and push',
    characteristics: {
      dormantScore: 0.80,
      eligible: true,
      contactCount: 3,
    },
    tags: ['multi-channel', 'engaged'],
  },
  {
    id: 'expiring-soon',
    name: 'Expiring Soon',
    phoneNumber: '+33699901020',
    description: 'Lead expires in 1 day (TTL test)',
    characteristics: {
      dormantScore: 0.77,
      eligible: true,
      simSwapDays: 89,
      reachable: false,
      deviceModel: 'Huawei P30',
      estimatedValue: 180,
    },
    tags: ['expiring', 'ttl', 'urgent'],
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
