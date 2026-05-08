'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CacheSession,
  AnswerValue,
  clearCache,
  flushCache,
  initCache,
  loadCacheByCode,
  saveAnswer   as cacheSaveAnswer,
  saveNavigation as cacheSaveNavigation,
} from './assessmentCache';

interface UseAssessmentCacheOptions {
  token:           string | null;
  module:          string;
  /** assessmentCode is the key used BEFORE the token exists (on refresh) */
  assessmentCode:  string;
  questions:       unknown[];
  expiresAt?:      string;
  answers:         Record<string, AnswerValue>;
  markedForReview: string[];
  currentIndex:    number;
  timeLeftSeconds: number;
}

interface UseAssessmentCacheReturn {
  cachedSession:       CacheSession | null;
  isCacheRestored:     boolean;
  isRestoredFromCache: boolean;
  saveAnswer:          (questionId: string, answer: AnswerValue) => void;
  saveNavigation:      (index: number, marked: string[], timeLeft: number) => void;
  clearSession:        () => Promise<void>;
}

export function useAssessmentCache(opts: UseAssessmentCacheOptions): UseAssessmentCacheReturn {
  const [cachedSession,       setCachedSession]       = useState<CacheSession | null>(null);
  const [isCacheRestored,     setIsCacheRestored]     = useState(false);
  const [isRestoredFromCache, setIsRestoredFromCache] = useState(false);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  // ── Step 1: Load cache by assessmentCode on mount (before token exists) ──
  useEffect(() => {
    if (!opts.assessmentCode) return;
    let cancelled = false;

    (async () => {
      const session = await loadCacheByCode(opts.assessmentCode);
      if (cancelled) return;
      if (session && session.status === 'in_progress') {
        setCachedSession(session);
        setIsRestoredFromCache(true);
      }
      setIsCacheRestored(true);
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.assessmentCode]);

  // ── Step 2: Init cache once token + questions arrive (fresh attempt) ──
  useEffect(() => {
    const { token, module, questions, assessmentCode, expiresAt } = optsRef.current;
    if (!token || questions.length === 0 || isRestoredFromCache) return;

    initCache({
      token,
      module,
      assessmentCode,
      questions,
      expiresAt:      expiresAt ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      timeLeftSeconds: optsRef.current.timeLeftSeconds,
      answers:         {},
      markedForReview: [],
      currentIndex:    0,
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.questions.length, opts.token, isRestoredFromCache]);

  // ── Step 3: Flush on tab hide / page unload ──
  useEffect(() => {
    const flush = () => {
      const { token, module, questions, assessmentCode, expiresAt, answers, markedForReview, currentIndex, timeLeftSeconds } = optsRef.current;
      if (!token) return;
      flushCache({
        token, module, assessmentCode, questions,
        expiresAt: expiresAt ?? '',
        answers, markedForReview, currentIndex, timeLeftSeconds,
        status: 'in_progress',
      } as any).catch(() => {});
    };

    const onHide    = () => { if (document.visibilityState === 'hidden') flush(); };
    const onUnload  = () => flush();

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  // ── Public callbacks ──
  const saveAnswerCb = useCallback((questionId: string, answer: AnswerValue) => {
    const { token, currentIndex, markedForReview, timeLeftSeconds } = optsRef.current;
    if (!token) return;
    cacheSaveAnswer(token, questionId, answer, { currentIndex, markedForReview, timeLeftSeconds });
  }, []);

  const saveNavigationCb = useCallback((index: number, marked: string[], timeLeft: number) => {
    const { token } = optsRef.current;
    if (!token) return;
    cacheSaveNavigation(token, index, marked, timeLeft);
  }, []);

  const clearSession = useCallback(async () => {
    const { token, assessmentCode } = optsRef.current;
    if (!token) return;
    await clearCache(token, assessmentCode);
  }, []);

  return { cachedSession, isCacheRestored, isRestoredFromCache, saveAnswer: saveAnswerCb, saveNavigation: saveNavigationCb, clearSession };
}
