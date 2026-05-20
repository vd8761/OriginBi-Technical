/**
 * API service layer for admin question CRUD operations.
 * Replaces the localStorage-based storage.ts for real DB persistence.
 */

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : (process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000");
const ADMIN_BASE = `${API_BASE}/api/assessment/admin`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ApiOption {
    id: number;
    text: string;
}

export interface ApiQuestion {
    id: number;
    assessmentId: number;
    category: string;
    subcategory?: string;
    difficulty: "easy" | "medium" | "hard";
    questionText: string;
    options: ApiOption[];
    correctOptionId: number | null;
    explanation: string | null;
    marks: number;
    negativeMarks: number;
    status: "active" | "inactive";
    mode: "trial" | "main";
    imageUrl: string | null;
    metadata: any;
    createdAt: string;
    updatedAt: string;
}

export interface CreateQuestionPayload {
    assessmentId?: number;
    category: string;
    subcategory?: string;
    difficulty?: "easy" | "medium" | "hard";
    questionText: string;
    options?: { text: string }[];
    correctOptionIndex?: number;
    explanation?: string;
    marks?: number;
    negativeMarks?: number;
    status?: "active" | "inactive";
    mode?: "trial" | "main";
    imageUrl?: string | null;
    metadata?: any;
}

export interface ApiAssessment {
    assessment_id: number;
    assessment_code: string;
    assessment_name: string;
    module_type: string;
    total_time_minutes: number;
    total_questions: number;
    status: string;
    created_at: string;
    question_limit?: number;
    categories?: string[] | string;
    difficulty_marks?: Record<string, number> | string;
    difficulty_negative_marks?: Record<string, number> | string;
    tab_switch_limit?: number;
    anti_copy_enabled?: boolean;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    amount?: number;
    trial_attempts_limit?: number;
    main_attempts_limit?: number;
    enabled_question_types?: Record<string, boolean> | string;
    proctoring_require_fullscreen?: boolean;
    fullscreen_exit_limit?: number;
    proctoring_block_devtools?: boolean;
    devtools_open_limit?: number;
    mouse_focus_loss_limit?: number;
    keypress_log_enabled?: boolean;
    require_camera_mic?: boolean;
    live_proctoring_enabled?: boolean;
    adaptive_enabled?: boolean;
    adaptive_total_marks?: number;
    adaptive_total_blocks?: number;
    adaptive_seconds_per_mark?: number;
}

// ─── Mapping ───────────────────────────────────────────────────────────────────

/**
 * Maps frontend module names to backend module names.
 */
const moduleMap: Record<string, string> = {
    communication: "grammar",
    role: "role",
    mnc: "mnc",
    aptitude: "aptitude",
    coding: "coding",
};

const getBackendModule = (m: string) => moduleMap[m] || m;

// ─── Fetch Helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(body.message || `API Error ${res.status}`);
    }

    return body as T;
}

// ─── Generic CRUD ──────────────────────────────────────────────────────────────

export async function fetchQuestions(module: string, params?: {
    assessmentId?: number;
    category?: string;
    status?: string;
    mode?: string;
    search?: string;
    subcategory?: string;
}): Promise<ApiQuestion[]> {
    const query = new URLSearchParams();
    if (params?.assessmentId) query.set("assessmentId", String(params.assessmentId));
    if (params?.category) query.set("category", params.category);
    if (params?.status) query.set("status", params.status);
    if (params?.mode) query.set("mode", params.mode);
    if (params?.search) query.set("search", params.search);
    if (params?.subcategory) query.set("subcategory", params.subcategory);

    const qs = query.toString();
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions${qs ? `?${qs}` : ""}`;
    const result = await apiFetch<{ data: ApiQuestion[] }>(url);
    return result.data;
}

export async function fetchQuestion(module: string, id: number): Promise<ApiQuestion> {
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions/${id}`;
    const result = await apiFetch<{ data: ApiQuestion }>(url);
    return result.data;
}

export async function createQuestion(
    module: string,
    payload: CreateQuestionPayload
): Promise<ApiQuestion> {
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions`;
    const result = await apiFetch<{ data: ApiQuestion }>(url, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function updateQuestion(
    module: string,
    id: number,
    payload: Partial<CreateQuestionPayload>
): Promise<ApiQuestion> {
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions/${id}`;
    const result = await apiFetch<{ data: ApiQuestion }>(url, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function deleteQuestion(module: string, id: number): Promise<void> {
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions/${id}`;
    await apiFetch<{ message: string }>(url, { method: "DELETE" });
}

export async function clearQuestions(module: string, mode?: string): Promise<void> {
    const query = mode ? `?mode=${mode}` : "";
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions${query}`;
    await apiFetch<{ message: string }>(url, { method: "DELETE" });
}

export async function bulkImportQuestions(
    module: string,
    questions: CreateQuestionPayload[],
    assessmentId?: number
): Promise<{ imported: number; total: number; errors?: string[] }> {
    const url = `${ADMIN_BASE}/${getBackendModule(module)}/questions/bulk`;
    return apiFetch(url, {
        method: "POST",
        body: JSON.stringify({ questions, assessmentId }),
    });
}

// ─── Assessments ───────────────────────────────────────────────────────────────

export async function fetchAssessments(module?: string): Promise<ApiAssessment[]> {
    const qs = module ? `?module=${getBackendModule(module)}` : "";
    const result = await apiFetch<{ data: ApiAssessment[] }>(
        `${ADMIN_BASE}/assessments${qs}`
    );
    return result.data;
}

export async function updateAssessment(
    id: number,
    payload: Partial<ApiAssessment>
): Promise<ApiAssessment> {
    const url = `${ADMIN_BASE}/assessments/${id}`;
    const result = await apiFetch<{ data: ApiAssessment }>(url, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function uploadQuestionAsset(
    module: string,
    file: File
): Promise<{ url: string; key: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${ADMIN_BASE}/upload?module=${getBackendModule(module)}`;
    const res = await fetch(url, {
        method: "POST",
        body: formData,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(body.message || `File Upload Error ${res.status}`);
    }
    return body;
}
