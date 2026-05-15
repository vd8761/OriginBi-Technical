"use client";

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const configuredAuthBase = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL?.replace(/\/$/, "");

// Go exam-engine (attempts, code runs, plugins, etc.)
export const API_BASE = configuredApiBase || "";

// OriginBI auth-service from the sibling app (Cognito auth).
export const AUTH_API_BASE = configuredAuthBase || "http://localhost:4002";

export const STUDENT_API_BASE =
  process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL?.replace(/\/$/, "") || "";

export const TECH_API_BASE =
  process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "";

const IS_BROWSER = typeof window !== "undefined";
const IS_DEV = process.env.NODE_ENV === "development";
const EXAM_SAME_ORIGIN = IS_BROWSER && API_BASE === window.location.origin;
const TECH_SAME_ORIGIN = IS_BROWSER && TECH_API_BASE === window.location.origin;

export const HAS_EXAM_API = Boolean(API_BASE) && !(IS_DEV && EXAM_SAME_ORIGIN);
export const HAS_TECH_API = Boolean(TECH_API_BASE) && !(IS_DEV && TECH_SAME_ORIGIN);

// ── Cognito token storage (browser only) - Main App Style ──────────────────
type TokenScope = "user" | "admin";

const ACCESS_TOKEN_KEY = "originbi:access-token";
const ID_TOKEN_KEY = "originbi:id-token";
const REFRESH_TOKEN_KEY = "originbi:refresh-token";
const ADMIN_ACCESS_TOKEN_KEY = "originbi:admin-access-token";
const ADMIN_ID_TOKEN_KEY = "originbi:admin-id-token";
const ADMIN_REFRESH_TOKEN_KEY = "originbi:admin-refresh-token";
const ADMIN_SESSION_FLAG_KEY = "originbi:admin-session";
const LEGACY_ACCESS_TOKEN_COOKIE = "obi.accessToken";

function getTokenKeys(scope: TokenScope) {
  return scope === "admin"
    ? {
        access: ADMIN_ACCESS_TOKEN_KEY,
        id: ADMIN_ID_TOKEN_KEY,
        refresh: ADMIN_REFRESH_TOKEN_KEY,
      }
    : {
        access: ACCESS_TOKEN_KEY,
        id: ID_TOKEN_KEY,
        refresh: REFRESH_TOKEN_KEY,
      };
}

function resolveTokenScope(path: string): TokenScope {
  return path.startsWith("/v1/admin") ? "admin" : "user";
}

export function getAccessToken(scope: TokenScope = "user"): string | null {
  if (typeof window === "undefined") return null;
  const ls = window.localStorage.getItem(getTokenKeys(scope).access);
  if (ls) return ls;
  // Fallback: legacy cookie may survive a "clear cache" that only wipes localStorage
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + LEGACY_ACCESS_TOKEN_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setTokens(t: {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}) {
  setScopedTokens("user", t);
}

export function setAdminTokens(t: {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}) {
  setScopedTokens("admin", t);
}

function setScopedTokens(
  scope: TokenScope,
  t: {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  },
) {
  if (typeof window === "undefined") return;
  const keys = getTokenKeys(scope);
  window.localStorage.setItem(keys.access, t.accessToken);
  window.localStorage.setItem(keys.id, t.idToken);
  if (t.refreshToken) window.localStorage.setItem(keys.refresh, t.refreshToken);
  // Keep the legacy access-token cookie because the older working proxy
  // validates server-side sessions from this exact cookie name.
  const cookieBase = "path=/; samesite=lax;";
  const maxAge = t.refreshToken ? 60 * 60 * 24 * 7 : 60 * 60;
  document.cookie = `${LEGACY_ACCESS_TOKEN_COOKIE}=${t.accessToken}; ${cookieBase} max-age=${maxAge}`;
}

function clearTokens(scope: TokenScope = "user") {
  if (typeof window === "undefined") return;
  const keys = getTokenKeys(scope);
  window.localStorage.removeItem(keys.access);
  window.localStorage.removeItem(keys.id);
  window.localStorage.removeItem(keys.refresh);
  if (scope === "admin") {
    window.localStorage.removeItem(ADMIN_SESSION_FLAG_KEY);
    window.localStorage.removeItem("originbi_id_token");
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("user");
    window.sessionStorage.removeItem("idToken");
    window.sessionStorage.removeItem("accessToken");
  }

  const cookieBase = "path=/; samesite=lax; max-age=0";
  document.cookie = `${LEGACY_ACCESS_TOKEN_COOKIE}=; ${cookieBase}`;
  document.cookie = `${keys.access}=; ${cookieBase}`;
  document.cookie = `${keys.id}=; ${cookieBase}`;
}

export function clearAdminSession() {
  clearTokens("admin");
}

export interface ApiUser {
  id: string | number;
  email: string;
  role: string | null;
  cognitoSub: string | null;
  emailVerified: boolean;
  isActive: boolean;
  isAdmin?: boolean;
  status?: string;
}

export interface ApiRegistration {
  id: string;
  fullName: string | null;
  gender: string | null;
  countryCode: string;
  mobileNumber: string;
  status: string;
  isTechAssessment: number;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface AuthResponse {
  user: ApiUser;
  registration: ApiRegistration | null;
  tokens?: AuthTokens;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  gender: string;
  countryCode: string;
  mobileNumber: string;
  role?: string;
  programCode?: string;
  schoolLevel?: string;
  schoolStream?: string;
  studentBoard?: string;
  departmentDegreeId?: string;
  currentYear?: string;
  currentRole?: string;
  roleDescription?: string;
  registrationSource?: string;
}

export interface Assignment {
  id: string;
  assignmentRef: string;
  itemRef: string;
  status: string;
  examVersionId: string;
  availableFrom?: string;
  availableUntil?: string;
  purchasedAt?: string;
  activeAttemptId?: string;
  attemptStatus?: string;
  completed: boolean;
}

export interface AssignmentListResponse {
  assignments: Assignment[];
}

export interface DemoPurchaseResponse {
  purchaseId: string;
  assignment: Assignment;
}

export interface SnapshotQuestion {
  examQuestionId: string;
  questionVersionId: string;
  ordinal: number;
  score: number;
  body: unknown;
}

export interface AnswerSnapshot {
  examQuestionId: string;
  state: "unattempted" | "viewed" | "attempted" | "solved" | "flagged" | "skipped";
  payload: AnswerPayload;
  savedAt?: string;
}

export interface AttemptSnapshot {
  attempt: {
    id: string;
    assignmentId: string;
    examVersionId: string;
    status: string;
    startedAt?: string;
    submittedAt?: string;
    deadlineAt?: string;
    timeRemainingMs: number;
  };
  assignmentRef: string;
  language: string;
  totalTimeSeconds: number;
  questions: SnapshotQuestion[];
  answers: AnswerSnapshot[];
}

export interface CodeFilePayload {
  path: string;
  content: string;
  readOnly?: boolean;
  language?: string;
}

export interface AnswerPayload {
  language?: string;
  files?: CodeFilePayload[];
  entryFile?: string;
  mcqAnswer?: number | null;
  [key: string]: unknown;
}

export interface CodeRunRequest {
  mode: "custom" | "tests";
  language: string;
  files: CodeFilePayload[];
  entryFile: string;
  customStdin?: string;
}

export interface CodeTestResult {
  input: string;
  expected: string;
  passed: boolean;
  actual: string;
  time: string;
}

export interface CodeRunResponse {
  type:
    | "success"
    | "partial"
    | "error"
    | "compile-error"
    | "timeout"
    | "memory-exceeded"
    | "output-exceeded"
    | "source-too-large";
  stdout: string;
  stderr: string;
  testResults?: CodeTestResult[];
  time: string;
  memory: string;
  summary: string;
  runId: string;
}

export interface AttemptEventInput {
  occurred_at: string;
  kind: string;
  severity?: number;
  exam_question_id?: string;
  payload?: Record<string, unknown>;
}

export interface HeartbeatResponse {
  received_at: string;
  rtt_ms: number;
  server_time_remaining_ms: number;
  deadline_at?: string;
  status: string;
}

export interface Plugin {
  id: string;
  kind: string;
  slug: string;
  name: string;
  version: string;
  pluginType?: string;
  category?: string;
  requires?: string[];
  extends?: string[];
  provides?: string[];
  schema?: Record<string, unknown>;
  configSchema?: Record<string, unknown> | null;
  requiresLicense: boolean;
  enabledByDefault: boolean;
  platformState: "disabled" | "enabled" | "restricted";
  platformConfig: Record<string, unknown>;
  dependents?: string[];
}

// LanguageSchema is the shape inside plugins.schema for category='language'.
// Matches plugins.schema JSONB seeded by migration 012.
export interface LanguageSchema {
  displayName: string;
  judge0LanguageId: number;
  fileExtension: string;
  defaultEntryFile?: string;
  compileFlags?: string | null;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  stackLimitKb?: number;
  processesLimit?: number;
  outputLimitKb?: number;
  supportsMultiFile?: boolean;
  monacoLanguageId: string;
  icon?: string | null;
  legacyItemRef?: string | null;
}

export interface MeLanguage {
  slug: string;
  displayName: string;
  monacoLanguageId: string;
  icon?: string | null;
  source: "purchase" | "org" | "free-tier";
  itemRef?: string;
  orgId?: string;
}

export interface AdminQuestion {
  id: string;
  pluginId: string;
  pluginSlug: string;
  title: string;
  isArchived: boolean;
  currentVersionId: string;
  versionNumber: number;
  difficulty: number;
  estimatedTimeSeconds?: number;
  body: Record<string, unknown>;
  maxScore: number;
  isNegativeMarked: boolean;
  negativeScore: number;
  createdAt: string;
}

export interface AdminTestCase {
  id: string;
  questionVersionId: string;
  ordinal: number;
  name: string;
  isSample: boolean;
  isHidden: boolean;
  weight: number;
  stdin: string;
  expectedStdout: string;
  comparator: string;
  comparatorConfig: Record<string, unknown>;
}

export interface AdminTestCaseInput {
  name?: string;
  is_sample?: boolean;
  is_hidden?: boolean;
  weight?: number;
  stdin?: string;
  expected_stdout?: string;
  comparator?: string;
  comparator_config?: Record<string, unknown>;
}

export interface AdminQuestionInput {
  title: string;
  plugin_slug?: string;
  body: Record<string, unknown>;
  test_cases?: AdminTestCaseInput[];
  max_score?: number;
  is_negative_marked?: boolean;
  negative_score?: number;
  difficulty?: number;
  estimated_time_seconds?: number;
}

export interface AdminExamPackage {
  id: string;
  currentVersionId: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  totalTimeSeconds: number;
  maxScore: number;
  settings: Record<string, unknown>;
  createdAt: string;
}

export interface AdminExamPackageInput {
  title: string;
  slug: string;
  description?: string;
  total_time_seconds?: number;
  max_score?: number;
  languages?: string[];
  price_cents?: number;
  currency?: string;
}

export interface AdminUserEntitlement {
  slug: string;
  displayName: string;
  source: string;
  itemRef?: string;
  orgId?: string;
}

export class ApiError extends Error {
  status: number;
  raw?: string;

  constructor(status: number, message: string, raw?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.raw = raw;
  }
}

interface FetchOpts extends RequestInit {
  baseOverride?: string;
  auth?: boolean;
  _retried?: boolean;
}

// Single in-flight refresh promise per token scope so concurrent 401s share
// one refresh call instead of stampeding Cognito.
const refreshInFlight: Record<TokenScope, Promise<boolean> | null> = {
  user: null,
  admin: null,
};

/** Decode JWT exp and return true if it's already expired (or near expiry). */
function isAccessTokenExpired(scope: TokenScope, skewSeconds = 30): boolean {
  if (typeof window === "undefined") return false;
  const tok = getAccessToken(scope);
  if (!tok) return false;
  try {
    const payload = JSON.parse(atob(tok.split(".")[1]));
    if (typeof payload.exp !== "number") return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= payload.exp - skewSeconds;
  } catch {
    return false;
  }
}

/** Use the refresh token to mint a new access/id token. Single-flight. */
async function refreshAccessToken(scope: TokenScope): Promise<boolean> {
  if (refreshInFlight[scope]) return refreshInFlight[scope];
  const refreshKey = getTokenKeys(scope).refresh;
  const refreshToken =
    typeof window !== "undefined" ? window.localStorage.getItem(refreshKey) : null;
  if (!refreshToken) return false;

  refreshInFlight[scope] = (async () => {
    try {
      const res = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.accessToken || !data?.idToken) return false;
      setScopedTokens(scope, {
        accessToken: data.accessToken,
        idToken: data.idToken,
        // Cognito's refresh flow doesn't issue a new refresh token; keep old.
        refreshToken,
      });
      return true;
    } catch {
      return false;
    } finally {
      // Allow next refresh attempt later
      setTimeout(() => {
        refreshInFlight[scope] = null;
      }, 0);
    }
  })();
  return refreshInFlight[scope];
}

export async function apiFetch<T>(path: string, init: FetchOpts = {}): Promise<T> {
  const { baseOverride, auth = true, _retried, ...rest } = init;
  const tokenScope = resolveTokenScope(path);
  // Proactively refresh if we know the token's expired — avoids a guaranteed
  // 401 round-trip when the page loads after sleeping past the 1h TTL.
  if (auth && !_retried && isAccessTokenExpired(tokenScope)) {
    await refreshAccessToken(tokenScope);
  }
  const headers = new Headers(rest.headers);
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    // The exam-engine's Cognito verifier (backend/exam-engine/internal/auth/
    // cognito.go) requires token_use=access — sending the id token gets
    // rejected with `token_use "id" is not 'access'`. Prefer the access
    // token; fall back to the id token only if access isn't stored (e.g.
    // older sessions written before login was fixed).
    const token = typeof window !== "undefined"
      ? (
          window.localStorage.getItem(getTokenKeys(tokenScope).access) ||
          window.localStorage.getItem(getTokenKeys(tokenScope).id)
        )
      : null;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    // Add X-User-Context if user data exists. The exam-engine's auth.Middleware
    // (backend/exam-engine/internal/auth/auth.go) trusts an upstream gateway
    // and reads X-User-Id / X-Org-Id directly — when the frontend talks to the
    // engine without going through the NestJS gateway, we must inject those
    // headers ourselves from the stored user object or every request 401s.
    if (typeof window !== "undefined") {
      const userData = window.localStorage.getItem("user");
      if (userData) {
        headers.set("X-User-Context", userData);
        try {
          const parsed = JSON.parse(userData);
          // user.id can come back as either a number (Postgres bigint serialized
          // as JSON number) or a string (when it round-trips through localStorage
          // that was originally written as a string). Coerce + validate either.
          const rawId = parsed?.id;
          const idStr = typeof rawId === "number" ? String(rawId) : typeof rawId === "string" ? rawId : "";
          if (idStr && /^\d+$/.test(idStr) && Number(idStr) > 0 && !headers.has("X-User-Id")) {
            headers.set("X-User-Id", idStr);
          }
          if (parsed && typeof parsed.orgId === "string" && parsed.orgId && !headers.has("X-Org-Id")) {
            headers.set("X-Org-Id", parsed.orgId);
          }
        } catch {
          // Stored user payload is not JSON — skip header injection.
        }
      }
    }
  }
  const base = baseOverride ?? API_BASE;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers,
    credentials: base === API_BASE ? "include" : "omit",
  });

  // Reactive refresh: if the server still says 401 despite us having a token,
  // try once to refresh and replay. After that, give up and surface 401.
  if (res.status === 401 && auth && !_retried && getAccessToken(tokenScope)) {
    const ok = await refreshAccessToken(tokenScope);
    if (ok) {
      return apiFetch<T>(path, { ...init, _retried: true });
    }
    // Refresh failed (token revoked / expired refresh) — drop credentials so
    // the proxy bounces the user to login on the next navigation.
    clearTokens(tokenScope);
  }

  // Final 401 from an admin-API call: the user has no usable session for the
  // exam-engine. Redirect to /admin/login so they can re-authenticate instead
  // of letting the page sit on stale data and re-fire 401s on every refetch.
  // Temporarily disabled while diagnosing why valid tokens still 401.
  if (res.status === 401 && auth && typeof window !== "undefined") {
    clearTokens(tokenScope);
    if (window.location.pathname.startsWith("/admin") &&
        !window.location.pathname.startsWith("/admin/login")) {
      window.location.replace(
        `/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
    }
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = errorMessageFrom(data) ?? res.statusText;
    throw new ApiError(res.status, msg, data?.__raw);
  }
  return data as T;
}

interface ErrorEnvelope {
  message?: string | string[];
  error?: string;
  __raw?: string;
}

function safeJson(text: string): ErrorEnvelope & Record<string, unknown> {
  try {
    return JSON.parse(text) as ErrorEnvelope & Record<string, unknown>;
  } catch {
    // Non-JSON body (commonly an HTML error page from a misrouted request).
    // Avoid surfacing the entire payload as the error message — callers
    // render this string in error toasts and that creates the appearance
    // of a "404 dump". Keep a short snippet plus the raw payload tucked
    // onto __raw for debugging surfaces (e.g. ErrorState <details>).
    const looksLikeHtml = /^\s*<(?:!doctype|html|head|body)\b/i.test(text);
    const summary = looksLikeHtml
      ? "Backend returned an HTML page instead of JSON (likely a misconfigured API base or unreachable service)."
      : text.slice(0, 240).trim() || "Request failed.";
    return { message: summary, __raw: text };
  }
}

function errorMessageFrom(data: ErrorEnvelope | null): string | null {
  if (!data) return null;
  if (Array.isArray(data.message)) return data.message.join(", ");
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return null;
}

// ── Auth (sibling auth-service, Cognito-backed) ───────────────────────────

export async function registerUser(input: RegisterRequest): Promise<AuthResponse> {
  // await assertRegistrationEmailAvailable(input.email);
  const registrationSource = input.registrationSource || "originbi-technical";

  const cognito = await apiFetch<{ sub?: string; email?: string; group?: string }>("/internal/cognito/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      groupName: input.role === "ADMIN" ? "ADMIN" : "STUDENT",
    }),
    baseOverride: AUTH_API_BASE,
    auth: false,
  });

  if (!cognito.sub) {
    throw new ApiError(502, "Auth service did not return a Cognito user id.");
  }

  await apiFetch<any>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      name: input.fullName,
      gender: input.gender,
      is_tech_assessment: 1,
      program_code: input.programCode,
      school_level: input.schoolLevel,
      school_stream: input.schoolStream,
      student_board: input.studentBoard,
      department_degree_id: input.departmentDegreeId,
      current_year: input.currentYear,
      current_role: input.currentRole,
      role_description: input.roleDescription,
    }),
    baseOverride: STUDENT_API_BASE,
    auth: false,
  });
  
  // Note: Main Student Service returns { success: true } and triggers emails.
  // It doesn't return tokens; the user must log in after registration.
  
  return {
    user: { email: input.email } as any,
    registration: null,
  } as any;
}

export async function getDepartments(): Promise<any[]> {
  return apiFetch<any[]>("/student/departments", {
    method: "POST",
    baseOverride: STUDENT_API_BASE,
    auth: false,
  });
}

interface LoginResponseBody {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

interface EmailAvailabilityResponse {
  available: boolean;
}

interface LoginOptions {
  group?: string;
}

async function assertRegistrationEmailAvailable(email: string): Promise<void> {
  const result = await apiFetch<EmailAvailabilityResponse>(
    `/v1/auth/email-availability?email=${encodeURIComponent(email)}`,
    {
      baseOverride: API_BASE,
      auth: false,
    },
  );
  if (!result.available) {
    throw new ApiError(409, "email already registered");
  }
}

export async function loginUser(
  email: string,
  password: string,
  options: LoginOptions = {},
): Promise<AuthResponse> {
  const res = await apiFetch<LoginResponseBody>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      ...(options.group ? { group: options.group } : {}),
    }),
    baseOverride: AUTH_API_BASE,
    auth: false,
  });

  if (!res.accessToken || !res.idToken) {
    throw new ApiError(502, "Auth service did not return a complete token set.");
  }

  const tokens = {
    accessToken: res.accessToken,
    idToken: res.idToken,
    refreshToken: res.refreshToken,
    expiresIn: res.expiresIn,
    tokenType: res.tokenType,
  };
  setTokens(tokens);

  let session: AuthResponse | null = null;
  try {
    session = await getSession();
  } catch (err) {
    console.warn("getSession failed, using fallback user session:", err);
  }

  if (!session) {
    // Fallback: If the backend doesn't support /auth/session, mock a session
    // using the login email so the user can still access the dashboard.
    return {
      user: { email, role: "STUDENT" } as any,
      registration: null,
      tokens,
    };
  }

  return {
    ...session,
    tokens,
  };
}

export async function logoutUser(): Promise<void> {
  const accessToken = getAccessToken("user");
  if (accessToken) {
    try {
      await apiFetch<{ message: string }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ accessToken }),
        baseOverride: AUTH_API_BASE,
        auth: false,
      });
    } catch {
      // best-effort; we still clear local tokens below
    }
  }
  clearTokens("user");
}

export async function getSession(): Promise<AuthResponse | null> {
  if (!getAccessToken("user")) return null;
  try {
    const res = await apiFetch<Omit<AuthResponse, "tokens">>("/auth/session", {
      baseOverride: AUTH_API_BASE,
    });
    return { ...res, tokens: undefined };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401)) {
      clearTokens("user");
      return null;
    }
    // If the endpoint is missing (404) or not implemented (501), 
    // treat it as "no session" rather than a hard crash.
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      return null;
    }
    throw err;
  }
}

export async function listAssignments(): Promise<AssignmentListResponse> {
  if (!HAS_EXAM_API) {
    return { assignments: [] };
  }
  return apiFetch<AssignmentListResponse>("/v1/me/assignments");
}

export async function demoPurchase(itemRef: string): Promise<DemoPurchaseResponse> {
  return apiFetch<DemoPurchaseResponse>("/v1/purchases/demo", {
    method: "POST",
    body: JSON.stringify({ itemRef }),
  });
}

export async function startAttempt(input: {
  assignmentId?: string;
  assignmentRef?: string;
}): Promise<AttemptSnapshot> {
  return apiFetch<AttemptSnapshot>("/v1/attempts/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveAttemptAnswer(
  attemptId: string,
  examQuestionId: string,
  input: { state: string; payload: AnswerPayload },
): Promise<{ saved: boolean; savedAt: string }> {
  return apiFetch<{ saved: boolean; savedAt: string }>(
    `/v1/attempts/${attemptId}/answers/${examQuestionId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function runAttemptCode(
  attemptId: string,
  examQuestionId: string,
  input: CodeRunRequest,
): Promise<CodeRunResponse> {
  const body: CodeRunRequest = {
    ...input,
    files: input.files.map((file) => ({
      path: file.path,
      content: file.content,
      ...(file.readOnly ? { readOnly: file.readOnly } : {}),
      ...(file.language ? { language: file.language } : {}),
    })),
  };
  return apiFetch<CodeRunResponse>(
    `/v1/attempts/${attemptId}/answers/${examQuestionId}/runs`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function sendAttemptHeartbeat(
  attemptId: string,
  clientState: Record<string, unknown>,
): Promise<HeartbeatResponse> {
  return apiFetch<HeartbeatResponse>(`/v1/attempts/${attemptId}/heartbeat`, {
    method: "POST",
    body: JSON.stringify({
      sent_at: new Date().toISOString(),
      client_state: clientState,
    }),
  });
}

export async function sendAttemptEvents(
  attemptId: string,
  events: AttemptEventInput[],
  options: { keepalive?: boolean } = {},
): Promise<{ accepted: number; rejected: number }> {
  return apiFetch<{ accepted: number; rejected: number }>(
    `/v1/attempts/${attemptId}/events`,
    {
      method: "POST",
      body: JSON.stringify({ events }),
      keepalive: options.keepalive,
    },
  );
}

export async function submitAttempt(
  attemptId: string,
  answers: { examQuestionId: string; state: string; payload: AnswerPayload }[],
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/v1/attempts/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function listPlugins(
  options: { category?: string } = {},
): Promise<{ plugins: Plugin[] }> {
  const q = options.category ? `?category=${encodeURIComponent(options.category)}` : "";
  return apiFetch<{ plugins: Plugin[] }>(`/v1/admin/plugins${q}`);
}

export async function getPlugin(pluginId: string): Promise<Plugin> {
  return apiFetch<Plugin>(`/v1/admin/plugins/${pluginId}`);
}

export async function createPlugin(input: {
  kind: string;
  slug: string;
  name: string;
  version: string;
  schema: Record<string, unknown>;
  plugin_type: string;
  category: string;
  requires?: string[];
  extends?: string[];
  provides?: string[];
  requires_license?: boolean;
  enabled_by_default?: boolean;
}): Promise<Plugin> {
  return apiFetch<Plugin>("/v1/admin/plugins", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Updates plugin metadata (name, version, schema). For state changes
 * (enable/disable/restrict) use updatePluginState.
 */
export async function updatePluginMetadata(
  pluginId: string,
  input: { name?: string; version?: string; schema?: Record<string, unknown> },
): Promise<Plugin> {
  return apiFetch<Plugin>(`/v1/admin/plugins/${pluginId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updatePluginState(
  pluginId: string,
  input: { state: Plugin["platformState"]; config?: Record<string, unknown> },
): Promise<void> {
  await apiFetch<{ status: string }>(`/v1/admin/plugins/${pluginId}/state`, {
    method: "PUT",
    body: JSON.stringify({ state: input.state, config: input.config ?? {} }),
  });
}

/** Persists a plugin's admin-facing platform config. Accepts UUIDs or slugs. */
export async function updatePluginConfig(
  pluginIdOrSlug: string,
  input: { config: Record<string, unknown>; state?: Plugin["platformState"] },
): Promise<Plugin> {
  return apiFetch<Plugin>(`/v1/admin/plugins/${encodeURIComponent(pluginIdOrSlug)}/config`, {
    method: "PUT",
    body: JSON.stringify({
      config: input.config,
      ...(input.state ? { state: input.state } : {}),
    }),
  });
}

/** Back-compat shim — old plugins page called updatePlugin(id, { state }). */
export async function updatePlugin(
  pluginId: string,
  input: { state: Plugin["platformState"]; config?: Record<string, unknown> },
): Promise<void> {
  return updatePluginState(pluginId, input);
}

export async function getPluginDependents(
  pluginId: string,
): Promise<{ dependents: string[] }> {
  return apiFetch<{ dependents: string[] }>(`/v1/admin/plugins/${pluginId}/dependents`);
}

// ── Candidate-side: language entitlements ─────────────────────────────────

export async function listMyLanguages(): Promise<{ languages: MeLanguage[] }> {
  return apiFetch<{ languages: MeLanguage[] }>("/v1/me/languages");
}

// ── Admin question authoring ──────────────────────────────────────────────

export async function listAdminQuestions(
  filters: { pluginSlug?: string; search?: string; difficulty?: number; includeArchived?: boolean } = {},
): Promise<{ questions: AdminQuestion[] }> {
  const params = new URLSearchParams();
  if (filters.pluginSlug) params.set("plugin_slug", filters.pluginSlug);
  if (filters.search) params.set("search", filters.search);
  if (filters.difficulty) params.set("difficulty", String(filters.difficulty));
  if (filters.includeArchived) params.set("archived", "true");
  const qs = params.toString();
  return apiFetch<{ questions: AdminQuestion[] }>(
    `/v1/admin/questions${qs ? `?${qs}` : ""}`,
  );
}

export async function getAdminQuestion(questionId: string): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>(`/v1/admin/questions/${questionId}`);
}

export async function createAdminQuestion(
  input: AdminQuestionInput,
): Promise<{ id: string; current_version_id: string; version_number: number }> {
  return apiFetch(`/v1/admin/questions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminQuestion(
  questionId: string,
  input: AdminQuestionInput,
): Promise<{ id: string; current_version_id: string; version_number: number }> {
  return apiFetch(`/v1/admin/questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function archiveAdminQuestion(questionId: string): Promise<void> {
  await apiFetch(`/v1/admin/questions/${questionId}`, { method: "DELETE" });
}

export async function listAdminTestCases(
  questionId: string,
): Promise<{ testCases: AdminTestCase[] }> {
  return apiFetch<{ testCases: AdminTestCase[] }>(
    `/v1/admin/questions/${questionId}/test-cases`,
  );
}

export async function appendAdminTestCase(
  questionId: string,
  input: AdminTestCaseInput,
): Promise<AdminTestCase> {
  return apiFetch<AdminTestCase>(`/v1/admin/questions/${questionId}/test-cases`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminTestCase(
  questionId: string,
  tcId: string,
  input: AdminTestCaseInput,
): Promise<AdminTestCase> {
  return apiFetch<AdminTestCase>(`/v1/admin/questions/${questionId}/test-cases/${tcId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteAdminTestCase(
  questionId: string,
  tcId: string,
): Promise<void> {
  await apiFetch(`/v1/admin/questions/${questionId}/test-cases/${tcId}`, {
    method: "DELETE",
  });
}

export async function bulkImportAdminQuestions(
  payload: { questions: AdminQuestionInput[] },
): Promise<{ created: Array<{ id: string }> }> {
  return apiFetch(`/v1/admin/questions/bulk-import`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Exam packages + pricing ───────────────────────────────────────────────

export async function listExamPackages(): Promise<{ examPackages: AdminExamPackage[] }> {
  return apiFetch<{ examPackages: AdminExamPackage[] }>(`/v1/admin/exam-packages`);
}

export async function getExamPackage(pkgId: string): Promise<AdminExamPackage> {
  return apiFetch<AdminExamPackage>(`/v1/admin/exam-packages/${pkgId}`);
}

export async function createExamPackage(
  input: AdminExamPackageInput,
): Promise<AdminExamPackage> {
  return apiFetch<AdminExamPackage>(`/v1/admin/exam-packages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateExamPackage(
  pkgId: string,
  input: AdminExamPackageInput,
): Promise<AdminExamPackage> {
  return apiFetch<AdminExamPackage>(`/v1/admin/exam-packages/${pkgId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function createPricingItem(input: {
  item_kind: string;
  item_ref: string;
  plugin_id?: string;
  price_cents: number;
  currency?: string;
}): Promise<{ id: string }> {
  return apiFetch(`/v1/admin/pricing-items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── User entitlements (support tool) ──────────────────────────────────────

export async function getUserEntitlements(
  userId: string,
): Promise<{ entitlements: AdminUserEntitlement[] }> {
  return apiFetch<{ entitlements: AdminUserEntitlement[] }>(
    `/v1/admin/users/${userId}/entitlements`,
  );
}

// ── Active email helper ───────────────────────────────────────────────────

export function getActiveEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const userData = window.localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed?.email) return String(parsed.email);
    }
  } catch {}
  try {
    const profile = window.localStorage.getItem("originbi:user-profile");
    if (profile) {
      const parsed = JSON.parse(profile);
      if (parsed?.email) return String(parsed.email);
    }
  } catch {}
  // Fallback: decode email from JWT token (cookie or localStorage)
  try {
    const tok = getAccessToken();
    if (tok) {
      const payload = JSON.parse(atob(tok.split(".")[1]));
      if (payload?.email) return String(payload.email);
      if (payload?.username && String(payload.username).includes("@")) {
        return String(payload.username);
      }
    }
  } catch {}
  return "";
}

// ── Purchase + completion sync (backend source of truth) ──────────────────

export async function getPurchasedAssessments(email: string): Promise<{ purchased: string[] }> {
  if (!HAS_TECH_API) {
    return { purchased: [] };
  }
  return apiFetch<{ purchased: string[] }>("/api/assessment/purchase/purchases", {
    method: "POST",
    body: JSON.stringify({ email }),
    baseOverride: TECH_API_BASE,
    auth: false,
  });
}

export async function getLatestSubmittedResult(module: string, userId: string): Promise<any> {
  return apiFetch<any>(
    `/api/assessment/${module}/latest-result?userId=${encodeURIComponent(userId)}`,
    {
      baseOverride: TECH_API_BASE,
      auth: false,
    },
  );
}

// ── Admin users roster ────────────────────────────────────────────────────

export interface AdminUserRow {
  id: number;
  email: string;
  fullName: string;
  role: string;
  roleGroup: "Admin" | "Proctor" | "Student";
  status: "active" | "blocked" | "pending";
  institutionName: string;
  assessments: number;
  lastSeenAt: string | null;
  createdAt: string | null;
}

export interface AdminUserCounts {
  total: number;
  students: number;
  admins: number;
  proctors: number;
  blocked: number;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
  counts: AdminUserCounts;
}

export interface ListAdminUsersParams {
  q?: string;
  role?: "admin" | "proctor" | "student";
  status?: "active" | "blocked" | "pending";
  limit?: number;
  offset?: number;
}

// ── Admin dashboard summary ───────────────────────────────────────────────

export interface AdminDashboardKPIs {
  activeCandidates: number;
  activeCandidatesOnline: number;
  questionBankTotal: number;
  questionBankPluginCount: number;
  liveSessions: number;
  liveSessionsMonitored: number;
  flaggedToday: number;
  flaggedAwaitingReview: number;
}

export interface AdminDashboardLiveAssessment {
  examVersionId: string;
  name: string;
  module: string;
  status: "live" | "scheduled" | "draft";
  completed: number;
  total: number;
  durationMinutes: number;
  updatedAt: string;
}

export interface AdminDashboardActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  tone: "green" | "amber" | "red" | "blue" | "neutral";
  createdAt: string;
}

export interface AdminDashboardDayCount {
  day: string;
  count: number;
}

export interface AdminDashboardSeries {
  submissionsPerDay: AdminDashboardDayCount[];
  proctorIncidentsPerDay: AdminDashboardDayCount[];
  submissionsWeekTotal: number;
  proctorIncidentsWeek: number;
  avgPassRateWeek: number | null;
}

export interface AdminDashboardSummary {
  kpis: AdminDashboardKPIs;
  liveAssessments: AdminDashboardLiveAssessment[];
  recentActivity: AdminDashboardActivityItem[];
  series: AdminDashboardSeries;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  return apiFetch<AdminDashboardSummary>(`/v1/admin/dashboard-summary`);
}

export async function listAdminUsers(
  params: ListAdminUsersParams = {},
): Promise<AdminUsersResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.role) qs.set("role", params.role);
  if (params.status) qs.set("status", params.status);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const suffix = qs.toString();
  return apiFetch<AdminUsersResponse>(
    `/v1/admin/users${suffix ? `?${suffix}` : ""}`,
  );
}
