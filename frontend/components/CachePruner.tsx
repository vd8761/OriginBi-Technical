'use client';

import { useEffect } from 'react';
import { pruneExpiredCaches } from '@/lib/assessmentCache';

/**
 * Prunes expired assessment cache entries from localStorage once on mount.
 * Rendered inside the root layout as a client component so the server
 * bundle is not polluted with browser-only APIs.
 */
export function CachePruner() {
  useEffect(() => {
    pruneExpiredCaches();
  }, []);
  return null;
}
