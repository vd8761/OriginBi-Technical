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
import { TechAttemptStatus, TechDifficulty, TechGrammarTaskType, TechQuestionStatus } from "./enums";
import { numericTransformer } from "./transformers";
import { UserEntity } from "./UserEntity";

@Entity({ name: "tech_grammar_questions" })
export class TechGrammarQuestion {
    @PrimaryGeneratedColumn("increment", { name: "grammar_question_id", type: "bigint" })
    grammarQuestionId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((question: TechGrammarQuestion) => question.assessment)
    assessmentId!: string;

    @Column({
        name: "task_type",
        type: "enum",
        enum: TechGrammarTaskType,
        enumName: "tech_grammar_task_type",
    })
    taskType!: TechGrammarTaskType;

    @Column({
        name: "difficulty",
        type: "enum",
        enum: TechDifficulty,
        enumName: "tech_difficulty",
    })
    difficulty!: TechDifficulty;

    @Column({ name: "question_text", type: "text" })
    questionText!: string;

    @Column({ name: "audio_url", type: "text", nullable: true })
    audioUrl!: string | null;

    @Column({ name: "passage_text", type: "text", nullable: true })
    passageText!: string | null;

    @Column({ name: "reference_answer", type: "text", nullable: true })
    referenceAnswer!: string | null;

    @Column({ name: "rubric_json", type: "json", nullable: true })
    rubricJson!: unknown | null;

    @ManyToOne(() => TechGrammarOption, { nullable: true })
    @JoinColumn({ name: "correct_option_id" })
    correctOption?: TechGrammarOption | null;

    @RelationId((question: TechGrammarQuestion) => question.correctOption)
    correctOptionId?: string | null;

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

    @OneToMany(() => TechGrammarOption, (option) => option.question)
    options!: TechGrammarOption[];
}

@Entity({ name: "tech_grammar_options" })
export class TechGrammarOption {
    @PrimaryGeneratedColumn("increment", { name: "option_id", type: "bigint" })
    optionId!: string;

    @ManyToOne(() => TechGrammarQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "grammar_question_id" })
    question!: TechGrammarQuestion;

    @RelationId((option: TechGrammarOption) => option.question)
    questionId!: string;

    @Column({ name: "option_text", type: "text" })
    optionText!: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;
}

@Entity({ name: "tech_grammar_attempts" })
export class TechGrammarAttempt {
    @PrimaryGeneratedColumn("increment", { name: "grammar_attempt_id", type: "bigint" })
    grammarAttemptId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((attempt: TechGrammarAttempt) => attempt.assessment)
    assessmentId!: string;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user!: UserEntity;

    @RelationId((attempt: TechGrammarAttempt) => attempt.user)
    userId!: string;

    @Column({ name: "attempt_token", type: "varchar", length: 100, unique: true })
    attemptToken!: string;

    @Column({ name: "shuffle_seed", type: "varchar", length: 100 })
    shuffleSeed!: string;

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

    @OneToMany(() => TechGrammarAttemptQuestion, (question) => question.attempt)
    questions!: TechGrammarAttemptQuestion[];
}

@Entity({ name: "tech_grammar_attempt_questions" })
@Unique("uq_grammar_attempt_question", ["attempt", "question"])
export class TechGrammarAttemptQuestion {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_id", type: "bigint" })
    attemptQuestionId!: string;

    @ManyToOne(() => TechGrammarAttempt, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "grammar_attempt_id" })
    attempt!: TechGrammarAttempt;

    @RelationId((attemptQuestion: TechGrammarAttemptQuestion) => attemptQuestion.attempt)
    attemptId!: string;

    @ManyToOne(() => TechGrammarQuestion, { nullable: false })
    @JoinColumn({ name: "grammar_question_id" })
    question!: TechGrammarQuestion;

    @RelationId((attemptQuestion: TechGrammarAttemptQuestion) => attemptQuestion.question)
    questionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;

    @ManyToOne(() => TechGrammarOption, { nullable: true })
    @JoinColumn({ name: "selected_option_id" })
    selectedOption?: TechGrammarOption | null;

    @RelationId((attemptQuestion: TechGrammarAttemptQuestion) => attemptQuestion.selectedOption)
    selectedOptionId?: string | null;

    @Column({ name: "answer_text", type: "text", nullable: true })
    answerText!: string | null;

    @Column({ name: "answer_audio_url", type: "text", nullable: true })
    answerAudioUrl!: string | null;

    @Column({ name: "converted_text", type: "text", nullable: true })
    convertedText!: string | null;

    @Column({ name: "ai_score_json", type: "json", nullable: true })
    aiScoreJson!: unknown | null;

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

    @Column({ name: "answered_at", type: "timestamp", nullable: true })
    answeredAt!: Date | null;

    @Column({ name: "is_locked", type: "boolean", default: false })
    isLocked!: boolean;

    @OneToMany(() => TechGrammarAttemptQuestionOption, (option) => option.attemptQuestion)
    options!: TechGrammarAttemptQuestionOption[];
}

@Entity({ name: "tech_grammar_attempt_question_options" })
@Unique("uq_grammar_attempt_option", ["attemptQuestion", "option"])
@Unique("uq_grammar_attempt_option_order", ["attemptQuestion", "displayOrder"])
export class TechGrammarAttemptQuestionOption {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_option_id", type: "bigint" })
    attemptQuestionOptionId!: string;

    @ManyToOne(() => TechGrammarAttemptQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "attempt_question_id" })
    attemptQuestion!: TechGrammarAttemptQuestion;

    @RelationId((entry: TechGrammarAttemptQuestionOption) => entry.attemptQuestion)
    attemptQuestionId!: string;

    @ManyToOne(() => TechGrammarOption, { nullable: false })
    @JoinColumn({ name: "option_id" })
    option!: TechGrammarOption;

    @RelationId((entry: TechGrammarAttemptQuestionOption) => entry.option)
    optionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;
}
