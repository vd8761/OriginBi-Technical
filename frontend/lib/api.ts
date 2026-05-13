"use client";

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const configuredAuthBase = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL?.replace(/\/$/, "");

// Go exam-engine (attempts, code runs, plugins, etc.)
export const API_BASE = configuredApiBase || "";

// NestJS assessment-service (Cognito auth, etc.)
export const AUTH_API_BASE = configuredAuthBase || "";

export const STUDENT_API_BASE =
  process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL?.replace(/\/$/, "") || "";

// ── Cognito token storage (browser only) - Main App Style ──────────────────
const ACCESS_TOKEN_KEY = "originbi:access-token";
const ID_TOKEN_KEY = "originbi:id-token";
const REFRESH_TOKEN_KEY = "originbi:refresh-token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}
function setTokens(t: {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, t.accessToken);
  window.localStorage.setItem(ID_TOKEN_KEY, t.idToken);
  if (t.refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, t.refreshToken);
  // Mirror the access token into a cookie so the Next.js proxy (SSR-side)
  // can validate the session before serving protected routes. Not httpOnly
  // because we set it from JS — the cookie value IS the token and the
  // proxy treats it as such.
  document.cookie = `${ACCESS_TOKEN_KEY}=${t.accessToken}; path=/; samesite=lax; max-age=${t.refreshToken ? 60 * 60 * 24 * 7 : 60 * 60}`;
}
function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ID_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; samesite=lax; max-age=0`;
}

export interface ApiUser {
  id: string;
  email: string;
  role: string | null;
  cognitoSub: string | null;
  emailVerified: boolean;
  isActive: boolean;
}

export interface ApiRegistration {
  id: string;
  fullName: string | null;
  gender: string | null;
  countryCode: string;
  mobileNumber: string;
  status: string;
  isTechAssessment: boolean;
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
  requiresLicense: boolean;
  enabledByDefault: boolean;
  platformState: "disabled" | "enabled" | "restricted";
  platformConfig: Record<string, unknown>;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface FetchOpts extends RequestInit {
  baseOverride?: string;
  auth?: boolean;
  _retried?: boolean;
}

// Single in-flight refresh promise so concurrent 401s share one refresh call
// instead of stampeding Cognito.
let refreshInFlight: Promise<boolean> | null = null;

/** Decode JWT exp and return true if it's already expired (or near expiry). */
function isAccessTokenExpired(skewSeconds = 30): boolean {
  if (typeof window === "undefined") return false;
  const tok = getAccessToken();
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
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = typeof window !== "undefined"
    ? window.localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.accessToken || !data?.idToken) return false;
      setTokens({
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
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();
  return refreshInFlight;
}

async function apiFetch<T>(path: string, init: FetchOpts = {}): Promise<T> {
  const { baseOverride, auth = true, _retried, ...rest } = init;
  // Proactively refresh if we know the token's expired — avoids a guaranteed
  // 401 round-trip when the page loads after sleeping past the 1h TTL.
  if (auth && !_retried && isAccessTokenExpired()) {
    await refreshAccessToken();
  }
  const headers = new Headers(rest.headers);
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = typeof window !== "undefined" 
      ? (window.localStorage.getItem(ID_TOKEN_KEY) || window.localStorage.getItem(ACCESS_TOKEN_KEY))
      : null;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    // Add X-User-Context if user data exists
    if (typeof window !== "undefined") {
      const userData = window.localStorage.getItem("user");
      if (userData) {
        headers.set("X-User-Context", userData);
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
  if (res.status === 401 && auth && !_retried && getAccessToken()) {
    const ok = await refreshAccessToken();
    if (ok) {
      return apiFetch<T>(path, { ...init, _retried: true });
    }
    // Refresh failed (token revoked / expired refresh) — drop credentials so
    // the proxy bounces the user to login on the next navigation.
    clearTokens();
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ??
      (Array.isArray(data?.message) ? data.message.join(", ") : null) ??
      res.statusText;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// ── Auth (NestJS assessment-service, Cognito-backed) ──────────────────────

export async function registerUser(input: RegisterRequest): Promise<AuthResponse> {
  const res = await apiFetch<any>("/student/register/tech", {
    method: "POST",
    body: JSON.stringify({
      full_name: input.fullName,
      email: input.email,
      mobile_number: input.mobileNumber,
      country_code: input.countryCode,
      password: input.password,
      gender: input.gender,
      is_tech_assessment: true,
    }),
    baseOverride: STUDENT_API_BASE,
    auth: false,
  });
  
  // Note: Main Student Service returns { success: true } and triggers emails.
  // It doesn't return tokens; the user must log in after registration.
  
  return {
    user: { email: input.email } as ApiUser,
    registration: null,
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    baseOverride: AUTH_API_BASE,
    auth: false,
  });

  const tokens = res.AuthenticationResult ? {
    accessToken: res.AuthenticationResult.AccessToken,
    idToken: res.AuthenticationResult.IdToken,
    refreshToken: res.AuthenticationResult.RefreshToken,
  } : undefined;

  if (tokens) setTokens(tokens);

  return {
    user: res.user || { email },
    registration: res.registration || null,
    tokens
  };
}

export async function logoutUser(): Promise<void> {
  const accessToken = getAccessToken();
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
  clearTokens();
}

export async function getSession(): Promise<AuthResponse | null> {
  if (!getAccessToken()) return null;
  try {
    const res = await apiFetch<Omit<AuthResponse, "tokens">>("/auth/session", {
      baseOverride: AUTH_API_BASE,
    });
    return { ...res, tokens: undefined };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearTokens();
      return null;
    }
    throw err;
  }
}

export async function listAssignments(): Promise<AssignmentListResponse> {
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

export async function listPlugins(): Promise<{ plugins: Plugin[] }> {
  return apiFetch<{ plugins: Plugin[] }>("/v1/admin/plugins");
}

export async function updatePlugin(
  pluginId: string,
  input: { state: Plugin["platformState"]; config?: Record<string, unknown> },
): Promise<void> {
  await apiFetch<{ status: string }>(`/v1/admin/plugins/${pluginId}`, {
    method: "PUT",
    body: JSON.stringify({ state: input.state, config: input.config ?? {} }),
  });
}
