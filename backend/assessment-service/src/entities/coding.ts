import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    Unique,
    UpdateDateColumn,
} from "typeorm";
import { TechAssessment } from "./assessment";
import {
    TechAttemptStatus,
    TechCompileStatus,
    TechDifficulty,
    TechQuestionStatus,
    TechRunStatus,
} from "./enums";
import { numericTransformer } from "./transformers";
import { UserEntity } from "./UserEntity";

@Entity({ name: "tech_coding_questions" })
export class TechCodingQuestion {
    @PrimaryGeneratedColumn("increment", { name: "coding_question_id", type: "bigint" })
    codingQuestionId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((question: TechCodingQuestion) => question.assessment)
    assessmentId!: string;

    @Column({
        name: "difficulty",
        type: "enum",
        enum: TechDifficulty,
        enumName: "tech_difficulty",
    })
    difficulty!: TechDifficulty;

    @Column({ name: "problem_title", type: "varchar", length: 150 })
    problemTitle!: string;

    @Column({ name: "problem_statement", type: "text" })
    problemStatement!: string;

    @Column({ name: "input_format", type: "text", nullable: true })
    inputFormat!: string | null;

    @Column({ name: "output_format", type: "text", nullable: true })
    outputFormat!: string | null;

    @Column({ name: "constraints", type: "text", nullable: true })
    constraints!: string | null;

    @Column({ name: "starter_code", type: "text", nullable: true })
    starterCode!: string | null;

    @Column({ name: "starter_code_json", type: "json", nullable: true })
    starterCodeJson!: unknown | null;

    @Column({ name: "starter_files_json", type: "json", nullable: true })
    starterFilesJson!: unknown | null;

    @Column({ name: "entry_file_json", type: "json", nullable: true })
    entryFileJson!: unknown | null;

    @Column({ name: "limits_json", type: "json", nullable: true })
    limitsJson!: unknown | null;

    @Column({ name: "sample_io_json", type: "json", nullable: true })
    sampleIoJson!: unknown | null;

    @Column({ name: "hidden_testcases_ref", type: "text", nullable: true })
    hiddenTestcasesRef!: string | null;

    @Column({ name: "allowed_languages_json", type: "json", nullable: true })
    allowedLanguagesJson!: unknown | null;

    @Column({
        name: "marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        transformer: numericTransformer,
    })
    marks!: number;

    @Column({
        name: "negative_marks",
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    negativeMarks!: number;

    @Column({
        name: "status",
        type: "enum",
        enum: TechQuestionStatus,
        enumName: "tech_question_status",
    })
    status!: TechQuestionStatus;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
    updatedAt!: Date;
}

@Entity({ name: "tech_coding_attempts" })
export class TechCodingAttempt {
    @PrimaryGeneratedColumn("increment", { name: "coding_attempt_id", type: "bigint" })
    codingAttemptId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((attempt: TechCodingAttempt) => attempt.assessment)
    assessmentId!: string;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user!: UserEntity;

    @RelationId((attempt: TechCodingAttempt) => attempt.user)
    userId!: string;

    @Column({ name: "attempt_token", type: "varchar", length: 100, unique: true })
    attemptToken!: string;

    @Column({
        name: "status",
        type: "enum",
        enum: TechAttemptStatus,
        enumName: "tech_attempt_status",
    })
    status!: TechAttemptStatus;

    @Column({ name: "started_at", type: "timestamp" })
    startedAt!: Date;

    @Column({ name: "expires_at", type: "timestamp" })
    expiresAt!: Date;

    @Column({ name: "submitted_at", type: "timestamp", nullable: true })
    submittedAt!: Date | null;

    @Column({
        name: "total_score",
        type: "decimal",
        precision: 8,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    totalScore!: number;

    @Column({
        name: "positive_score",
        type: "decimal",
        precision: 8,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    positiveScore!: number;

    @Column({
        name: "negative_score",
        type: "decimal",
        precision: 8,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    negativeScore!: number;

    @Column({ name: "time_taken_seconds", type: "int", nullable: true })
    timeTakenSeconds!: number | null;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
    updatedAt!: Date;

    @OneToMany(() => TechCodingAttemptQuestion, (question) => question.attempt)
    questions!: TechCodingAttemptQuestion[];
}

@Entity({ name: "tech_coding_attempt_questions" })
@Unique("uq_coding_attempt_question", ["attempt", "question"])
export class TechCodingAttemptQuestion {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_id", type: "bigint" })
    attemptQuestionId!: string;

    @ManyToOne(() => TechCodingAttempt, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "coding_attempt_id" })
    attempt!: TechCodingAttempt;

    @RelationId((attemptQuestion: TechCodingAttemptQuestion) => attemptQuestion.attempt)
    attemptId!: string;

    @ManyToOne(() => TechCodingQuestion, { nullable: false })
    @JoinColumn({ name: "coding_question_id" })
    question!: TechCodingQuestion;

    @RelationId((attemptQuestion: TechCodingAttemptQuestion) => attemptQuestion.question)
    questionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;

    @Column({ name: "language", type: "varchar", length: 50, nullable: true })
    language!: string | null;

    @Column({ name: "submitted_code", type: "text", nullable: true })
    submittedCode!: string | null;

    @Column({ name: "judge_input_ref", type: "text", nullable: true })
    judgeInputRef!: string | null;

    @Column({ name: "judge_output_ref", type: "text", nullable: true })
    judgeOutputRef!: string | null;

    @Column({
        name: "compile_status",
        type: "enum",
        enum: TechCompileStatus,
        enumName: "tech_compile_status",
        nullable: true,
    })
    compileStatus!: TechCompileStatus | null;

    @Column({
        name: "run_status",
        type: "enum",
        enum: TechRunStatus,
        enumName: "tech_run_status",
        nullable: true,
    })
    runStatus!: TechRunStatus | null;

    @Column({ name: "judge_result_json", type: "json", nullable: true })
    judgeResultJson!: unknown | null;

    @Column({ name: "is_correct", type: "boolean", nullable: true })
    isCorrect!: boolean | null;

    @Column({
        name: "score_awarded",
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    scoreAwarded!: number;

    @Column({
        name: "negative_applied",
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    negativeApplied!: number;

    @Column({ name: "execution_time_ms", type: "int", nullable: true })
    executionTimeMs!: number | null;

    @Column({ name: "memory_used_kb", type: "int", nullable: true })
    memoryUsedKb!: number | null;

    @Column({ name: "submitted_at", type: "timestamp", nullable: true })
    submittedAt!: Date | null;

    @Column({ name: "is_locked", type: "boolean", default: false })
    isLocked!: boolean;
}
