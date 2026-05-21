"use client";

// This module used to own the proctoring hooks. They were extracted to
// `frontend/lib/proctoring/` so non-coding assessment engines can share
// the same rules. This file stays as a re-export shim so existing imports
// from `components/assessment/coding/proctoring` keep working without
// rewrites at every call site.

export {
    DEFAULT_PROCTORING,
    EMPTY_COUNTERS,
    exitFullscreen,
    requestFullscreen,
    resolveProctoringForPackage,
    useProctoring,
    useProctoringSettings,
} from "@/lib/proctoring";
export type {
    PackageProctoringInput,
    ProctoringCounter,
    ProctoringCounters,
    ProctoringMessage,
    ProctoringSettings,
} from "@/lib/proctoring";
