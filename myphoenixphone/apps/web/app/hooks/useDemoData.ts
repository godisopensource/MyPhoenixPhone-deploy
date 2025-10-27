'use client';

import { useDemo } from '../contexts/DemoContext';

/**
 * Hook for accessing demo mode data in forms and pages.
 * Returns the current demo phone number and scenario info.
 */
export function useDemoData() {
  const { isDemoMode, currentScenario } = useDemo();

  return {
    // Whether demo mode is currently active
    isDemoMode,
    
    // The currently selected scenario (or null)
    scenario: currentScenario,
    
    // The phone number to use (from scenario or empty string)
    phoneNumber: isDemoMode && currentScenario ? currentScenario.phoneNumber : '',
    
    // Helper to get a characteristic value
    getCharacteristic: <K extends keyof NonNullable<typeof currentScenario>['characteristics']>(
      key: K
    ): NonNullable<typeof currentScenario>['characteristics'][K] | undefined => {
      return currentScenario?.characteristics[key];
    },
    
    // Helper to check if scenario has a specific tag
    hasTag: (tag: string): boolean => {
      return currentScenario?.tags.includes(tag) ?? false;
    },
    
    // Characteristics shortcuts for common checks
    characteristics: currentScenario ? {
      dormantScore: currentScenario.characteristics.dormantScore,
      eligible: currentScenario.characteristics.eligible,
      simSwapDays: currentScenario.characteristics.simSwapDays,
      reachable: currentScenario.characteristics.reachable,
      deviceModel: currentScenario.characteristics.deviceModel,
      estimatedValue: currentScenario.characteristics.estimatedValue,
      hasConsent: currentScenario.characteristics.hasConsent,
      hasVerification: currentScenario.characteristics.hasVerification,
      hasPricing: currentScenario.characteristics.hasPricing,
      handoverChoice: currentScenario.characteristics.handoverChoice,
      optedOut: currentScenario.characteristics.optedOut,
      contactCount: currentScenario.characteristics.contactCount,
    } : null,
  };
}
