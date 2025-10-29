'use client';

import { useState, useEffect } from 'react';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  variants?: Record<string, number>;
}

interface FlagResult {
  enabled: boolean;
  variant?: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(flagKey: string, userId?: string): FlagResult {
  const [result, setResult] = useState<FlagResult>({
    enabled: false,
    variant: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchFlag = async () => {
      try {
        const apiUrl = (typeof window !== 'undefined' && window.location.origin.includes('localhost'))
          ? 'http://localhost:3003'
          : (process.env.NEXT_PUBLIC_API_URL || '/api');
        const endpoint = userId
          ? `${apiUrl}/feature-flags/${flagKey}/variant/${userId}`
          : `${apiUrl}/feature-flags/${flagKey}`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch flag');

        const data = await res.json();
        setResult({
          enabled: data.enabled ?? false,
          variant: data.variant ?? null,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        setResult({
          enabled: false,
          variant: null,
          loading: false,
          error: err?.message || 'Unknown error',
        });
      }
    };

    fetchFlag();
  }, [flagKey, userId]);

  return result;
}

/**
 * Hook to get all feature flags
 */
export function useAllFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const apiUrl = (typeof window !== 'undefined' && window.location.origin.includes('localhost'))
          ? 'http://localhost:3003'
          : (process.env.NEXT_PUBLIC_API_URL || '/api');
        const res = await fetch(`${apiUrl}/feature-flags`);
        if (!res.ok) throw new Error('Failed to fetch flags');

        const data = await res.json();
        setFlags(data);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Unknown error');
        setLoading(false);
      }
    };

    fetchFlags();
  }, []);

  return { flags, loading, error };
}

/**
 * Component wrapper for conditional rendering based on feature flag
 */
export function FeatureGate({
  flag,
  userId,
  children,
  fallback = null,
}: {
  flag: string;
  userId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { enabled, loading } = useFeatureFlag(flag, userId);

  if (loading) return <>{fallback}</>;
  if (!enabled) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Variant-based rendering
 */
export function VariantSwitch({
  flag,
  userId,
  variants,
  defaultVariant,
}: {
  flag: string;
  userId?: string;
  variants: Record<string, React.ReactNode>;
  defaultVariant?: React.ReactNode;
}) {
  const { variant, loading } = useFeatureFlag(flag, userId);

  if (loading) return <>{defaultVariant}</>;
  if (!variant || !variants[variant]) return <>{defaultVariant}</>;

  return <>{variants[variant]}</>;
}
