/**
 * ============================================================
 *  ASSESSMENT CACHE MANAGER
 *  Strategy: Write-Through + Snapshot-on-Answer
 *
 *  Layer 1 – localStorage (fast, synchronous):
 *    Stores the current answer map, current question index,
 *    marked-for-review set, and the last-updated timestamp.
 *    Written on every answer change so recovery is instant.
 *
 *  Layer 2 – IndexedDB (large, async):
 *    Stores the full question list (can be large), attempt
 *    metadata, and a complete session snapshot.  Used when
 *    localStorage quota is exceeded or the session is resumed
 *    after a hard reload.
 *
 *  Recovery flow:
 *    1. On mount, engine calls `loadCache(token)`.
 *    2. Fast path: localStorage hit → restore answers, index,
 *       marked set and remaining time in < 1 ms.
 *    3. Slow path: IndexedDB hit → restore full state.
 *    4. If the server already has the attempt marked as
 *       "submitted", the cache is cleared (stale guard).
 *
 *  Expiry:
 *    Cache entries expire after `CACHE_TTL_MS` (default 4 h).
 *    Expired entries are pruned on every read.
 * ============================================================
 */

// ── Constants ─────────────────────────────────────────────────
const CACHE_TTL_MS   = 4 * 60 * 60 * 1000; // 4 hours
const IDB_DB_NAME    = 'OriginBIAssessmentCache';
const IDB_DB_VERSION = 1;
const IDB_STORE      = 'sessions';
const LS_PREFIX      = 'obi_assess_cache_';
// Secondary index: assessmentCode → token (so we can find cache before token is known)
const LS_INDEX_PREFIX = 'obi_assess_idx_';
// Persistent cache: keep IndexedDB snapshots for larger payloads.
const USE_IDB = true;

// ── Active student scoping ────────────────────────────────────
// Cache keys are scoped per-student so that Student Y on the same
// device can never resume Student X's in-progress assessment.
let _activeStudentEmail: string | null = null;

/**
 * Set the active student email.  Called once after login and on app boot.
 * All subsequent cache reads/writes will be scoped to this email.
 */
export function setActiveStudent(email: string | null): void {
  _activeStudentEmail = email?.toLowerCase().trim() ?? null;
}

/** Returns the normalised active student email, or null. */
export function getActiveStudent(): string | null {
  return _activeStudentEmail;
}

// ── Types ─────────────────────────────────────────────────────

export interface AnswerValue {
  // MCQ/MSQ: the selected option id(s) (string or array of strings)
  optionId?: string | string[];
  // Text-based (writing / speaking)
  text?: string;
  // Audio-based
  audioBase64?: string;
  audioUrl?: string;
  audioBlobUrl?: string;
  // Coding
  code?: string;
  language?: string;
  // Raw fallback
  raw?: unknown;
}

export interface CacheSession {
  /** The unique assessment attempt token from the backend */
  token: string;
  /** Assessment module name: aptitude | coding | grammar | mnc | role */
  module: string;
  /** Serialised questions (can be large for coding) */
  questions: unknown[];
  /** Attempt expiry provided by the backend */
  expiresAt: string;
  /** Number of seconds remaining when the page was last visible */
  timeLeftSeconds: number;
  /** Epoch ms when the cache entry was last written */
  lastUpdatedAt: number;
  /** Map of questionId → answer */
  answers: Record<string, AnswerValue>;
  /** Array of questionIds marked for review */
  markedForReview: string[];
  /** Last active question index */
  currentIndex: number;
  /** Submission status – guard against serving stale data */
  status: 'in_progress' | 'submitted';
  /** Email of the student who owns this cache entry (cross-student guard) */
  ownerEmail?: string;
  /** Adaptive assessment properties */
  currentBlock?: any;
  currentBlockNumber?: number;
  blockConfig?: any;
  attemptToken?: string;
  completedBlocks?: number[];
}

// ── localStorage helpers ───────────────────────────────────────

function lsKey(token: string) {
  return `${LS_PREFIX}${token}`;
}

/** Writes a lightweight snapshot to localStorage (fast path). */
function lsWrite(session: CacheSession) {
  try {
    const payload = {
      token:           session.token,
      module:          session.module,
      answers:         session.answers,
      markedForReview: session.markedForReview,
      currentIndex:    session.currentIndex,
      timeLeftSeconds: session.timeLeftSeconds,
      lastUpdatedAt:   session.lastUpdatedAt,
      status:          session.status,
      expiresAt:       session.expiresAt,
      assessmentCode:  (session as any).assessmentCode,
    };
    localStorage.setItem(lsKey(session.token), JSON.stringify(payload));
  } catch {
    // localStorage quota exceeded – silently fail; IDB is the safety net
  }
}

/**
 * Build a student-scoped index key.
 * Format: obi_assess_idx_<email>__<assessmentCode>
 * If no active student is set, falls back to the bare code (legacy compat).
 */
function scopedIndexKey(assessmentCode: string): string {
  const email = _activeStudentEmail;
  if (email) {
    return `${LS_INDEX_PREFIX}${email}__${assessmentCode}`;
  }
  return `${LS_INDEX_PREFIX}${assessmentCode}`;
}

/** Write secondary index: assessmentCode → token (scoped by active student) */
function lsWriteIndex(assessmentCode: string, token: string) {
  try {
    localStorage.setItem(scopedIndexKey(assessmentCode), token);
  } catch { /* noop */ }
}

/** Find a token by assessmentCode from the secondary index (scoped by active student) */
function lsFindByCode(assessmentCode: string): string | null {
  try {
    return localStorage.getItem(scopedIndexKey(assessmentCode)) ?? null;
  } catch { return null; }
}

function lsClearIndex(assessmentCode: string) {
  try { localStorage.removeItem(scopedIndexKey(assessmentCode)); } catch { /* noop */ }
}

/** Reads the lightweight snapshot from localStorage. */
function lsRead(token: string): Partial<CacheSession> | null {
  try {
    const raw = localStorage.getItem(lsKey(token));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<CacheSession> & { lastUpdatedAt?: number };
    if (!data.lastUpdatedAt) return null;
    if (Date.now() - data.lastUpdatedAt > CACHE_TTL_MS) {
      localStorage.removeItem(lsKey(token));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function lsClear(token: string) {
  try { localStorage.removeItem(lsKey(token)); } catch { /* noop */ }
}

// ── IndexedDB helpers ──────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'token' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

async function idbWrite(session: CacheSession) {
  if (!USE_IDB) return;
  try {
    const db    = await openIDB();
    const tx    = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(session);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* silently fail – localStorage is the primary fast path */ }
}

async function idbRead(token: string): Promise<CacheSession | null> {
  if (!USE_IDB) return null;
  try {
    const db    = await openIDB();
    const tx    = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req   = store.get(token);
    const session = await new Promise<CacheSession | null>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
    if (!session) return null;
    if (Date.now() - session.lastUpdatedAt > CACHE_TTL_MS) {
      await idbClear(token);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

async function idbClear(token: string) {
  if (!USE_IDB) return;
  try {
    const db    = await openIDB();
    const tx    = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(token);
  } catch { /* noop */ }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Initialise a new cache session when an assessment attempt starts.
 * Writes to both layers.
 */
export async function initCache(session: Omit<CacheSession, 'lastUpdatedAt' | 'status'> & { assessmentCode?: string }): Promise<void> {
  const full: CacheSession = {
    ...session,
    lastUpdatedAt: Date.now(),
    status: 'in_progress',
    ownerEmail: _activeStudentEmail ?? undefined,
  };
  lsWrite(full);
  if (session.assessmentCode) {
    lsWriteIndex(session.assessmentCode, session.token);
  }
  await idbWrite(full);
}

/**
 * Persist a single answer change.
 * Writes the lightweight snapshot to localStorage synchronously,
 * then queues an async IndexedDB update.
 */
export function saveAnswer(
  token:          string,
  questionId:     string,
  answer:         AnswerValue,
  extras: {
    currentIndex:    number;
    markedForReview: string[];
    timeLeftSeconds: number;
  }
): void {
  const existing = lsRead(token);
  if (!existing) return; // session not initialised

  const merged: CacheSession = {
    ...(existing as CacheSession),
    answers: { ...(existing.answers ?? {}), [questionId]: answer },
    currentIndex:    extras.currentIndex,
    markedForReview: extras.markedForReview,
    timeLeftSeconds: extras.timeLeftSeconds,
    lastUpdatedAt:   Date.now(),
  };

  // Layer 1: synchronous – no flicker
  lsWrite(merged);

  // Layer 2: async – fire and forget
  idbWrite(merged).catch(() => {});
}

/**
 * Persist navigation state (index, marked, time) WITHOUT changing answers.
 * Called when the user navigates between questions or the timer ticks.
 * Only writes to localStorage (fast path) to avoid IDB overhead on every tick.
 */
export function saveNavigation(
  token:          string,
  currentIndex:   number,
  markedForReview: string[],
  timeLeftSeconds: number,
): void {
  const existing = lsRead(token);
  if (!existing) return;
  lsWrite({
    ...(existing as CacheSession),
    currentIndex,
    markedForReview,
    timeLeftSeconds,
    lastUpdatedAt: Date.now(),
  });
}

/**
 * Flush a full snapshot to both layers (e.g. on page visibility change
 * or before the window unloads).
 */
export async function flushCache(session: Omit<CacheSession, 'lastUpdatedAt'>): Promise<void> {
  const full: CacheSession = { ...session, lastUpdatedAt: Date.now() };
  lsWrite(full);
  await idbWrite(full);
}

/**
 * Load the best available cached session for `token`.
 * Fast path: localStorage.  Slow path: IndexedDB (has questions array).
 * Returns null if no valid cache exists.
 */
export async function loadCache(token: string): Promise<CacheSession | null> {
  // Fast path – answers + navigation (no questions array)
  const fast = lsRead(token);

  // Always attempt IDB for the full session (which has questions)
  const full = USE_IDB ? await idbRead(token) : null;

  if (!full && !fast) return null;

  // Merge: IDB has questions; LS has the most recent answers
  if (full && fast) {
    return {
      ...full,
      answers:         fast.answers         ?? full.answers,
      currentIndex:    fast.currentIndex    ?? full.currentIndex,
      markedForReview: fast.markedForReview ?? full.markedForReview,
      timeLeftSeconds: fast.timeLeftSeconds ?? full.timeLeftSeconds,
      lastUpdatedAt:   Math.max(fast.lastUpdatedAt ?? 0, full.lastUpdatedAt),
    };
  }

  return (full ?? fast) as CacheSession;
}

/**
 * Mark the session as submitted and clear both cache layers.
 */
export async function clearCache(token: string, assessmentCode?: string): Promise<void> {
  lsClear(token);
  if (assessmentCode) lsClearIndex(assessmentCode);
  await idbClear(token);
}

/**
 * Find and load a cached session by assessmentCode (before the token is known).
 * Uses the secondary localStorage index to resolve the token, then loads the full session.
 * This is the key function that enables cache restoration on page refresh.
 */
export async function loadCacheByCode(assessmentCode: string): Promise<CacheSession | null> {
  const token = lsFindByCode(assessmentCode);
  if (!token) return null;
  const session = await loadCache(token);
  // Cross-student guard: reject cache if it was written by a different student
  if (session?.ownerEmail && _activeStudentEmail && session.ownerEmail !== _activeStudentEmail) {
    console.warn('[assessmentCache] Rejecting cache entry owned by', session.ownerEmail, '(active:', _activeStudentEmail, ')');
    return null;
  }
  return session;
}

/**
 * Prune all expired assessment cache entries from localStorage.
 * Call once on app boot.
 */
export function pruneExpiredCaches(): void {
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(LS_PREFIX)) continue;
      try {
        const v = JSON.parse(localStorage.getItem(k) ?? '{}');
        if (!v.lastUpdatedAt || Date.now() - v.lastUpdatedAt > CACHE_TTL_MS) {
          toDelete.push(k);
        }
      } catch {
        toDelete.push(k!);
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

/**
 * Retrieve all in-progress cached tokens (useful for showing a
 * "Resume Assessment" banner on the dashboard).
 */
export function getInProgressTokens(): Array<{ token: string; module: string; lastUpdatedAt: number }> {
  const result: Array<{ token: string; module: string; lastUpdatedAt: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(LS_PREFIX)) continue;
      try {
        const v = JSON.parse(localStorage.getItem(k) ?? '{}') as Partial<CacheSession>;
        if (
          v.status === 'in_progress' &&
          v.token &&
          v.module &&
          v.lastUpdatedAt &&
          Date.now() - v.lastUpdatedAt < CACHE_TTL_MS
        ) {
          result.push({ token: v.token, module: v.module, lastUpdatedAt: v.lastUpdatedAt });
        }
      } catch { /* skip */ }
    }
  } catch { /* noop */ }
  return result;
}

/**
 * Clear ALL assessment cache entries from localStorage and IndexedDB.
 * Called on student logout to prevent cross-student session leakage.
 */
export async function clearAllAssessmentCaches(): Promise<void> {
  try {
    // Collect all cache + index keys
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(LS_PREFIX) || k.startsWith(LS_INDEX_PREFIX))) {
        toDelete.push(k);
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }

  // Wipe IndexedDB store entirely
  if (USE_IDB) {
    try {
      const db = await openIDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* noop */ }
  }

  _activeStudentEmail = null;
}
