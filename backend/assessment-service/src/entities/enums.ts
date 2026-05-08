export enum TechModuleType {
    aptitude = "aptitude",
    grammar = "grammar",
    coding = "coding",
    mnc = "mnc",
    role = "role",
}

export enum TechAssessmentStatus {
    draft = "draft",
    active = "active",
    closed = "closed",
}

export enum TechQuestionStatus {
    active = "active",
    inactive = "inactive",
}

export enum TechDifficulty {
    easy = "easy",
    medium = "medium",
    hard = "hard",
}

export enum TechAttemptStatus {
    in_progress = "in_progress",
    submitted = "submitted",
    evaluated = "evaluated",
    expired = "expired",
}

export enum TechGrammarTaskType {
    mcq = "mcq",
    reading = "reading",
    listening_mcq = "listening_mcq",
    reading_mcq = "reading_mcq",
    speaking = "speaking",
    writing = "writing",
}

export enum TechCompileStatus {
    success = "success",
    compile_error = "compile_error",
    not_run = "not_run",
}

export enum TechRunStatus {
    passed = "passed",
    failed = "failed",
    partial = "partial",
    not_run = "not_run",
}

export enum TechRoleQuestionType {
    mcq = "mcq",
    scenario = "scenario",
}
