"use client";

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

export const API_BASE =
  configuredApiBase ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8088");

export interface ApiUser {
  id: number;
  email: string;
  status: string;
  isAdmin: boolean;
}

export interface ApiRegistration {
  fullName: string;
  gender: string;
  countryCode: string;
  phone: string;
  role: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  educationLevel?: string;
  institutionName?: string;
  graduationYear?: number;
  workStatus?: string;
  metadata?: unknown;
}

export interface AuthResponse {
  user: ApiUser;
  registration: ApiRegistration;
  expiresAt?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  gender: string;
  countryCode: string;
  phone: string;
  role: string;
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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText);
  }
  return data as T;
}

export async function registerUser(input: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutUser(): Promise<void> {
  await apiFetch<{ status: string }>("/v1/auth/logout", { method: "POST" });
}

export async function getSession(): Promise<AuthResponse | null> {
  try {
    return await apiFetch<AuthResponse>("/v1/auth/session");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
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
