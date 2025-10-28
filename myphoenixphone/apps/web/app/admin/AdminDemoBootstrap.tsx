"use client";

import { useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';

export function AdminDemoBootstrap() {
  const { setDemoMode } = useDemo();
  useEffect(() => {
    setDemoMode(true);
  }, [setDemoMode]);
  return null;
}
