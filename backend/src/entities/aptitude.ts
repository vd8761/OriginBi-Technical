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
import { TechAttemptStatus, TechDifficulty, TechQuestionStatus } from "./enums";
import { numericTransformer } from "./transformers";
import { UserEntity } from "./UserEntity";

@Entity({ name: "tech_aptitude_questions" })
export class TechAptitudeQuestion {
    @PrimaryGeneratedColumn("increment", { name: "aptitude_question_id", type: "bigint" })
    aptitudeQuestionId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((question: TechAptitudeQuestion) => question.assessment)
    assessmentId!: string;

    @Column({ name: "subcategory", type: "varchar", length: 100 })
    subcategory!: string;

    @Column({
        name: "difficulty",
        type: "enum",
        enum: TechDifficulty,
        enumName: "tech_difficulty",
    })
    difficulty!: TechDifficulty;

    @Column({ name: "question_text", type: "text" })
    questionText!: string;

    @Column({ name: "image_url", type: "text", nullable: true })
    imageUrl!: string | null;

    @Column({ name: "image_metadata", type: "json", nullable: true })
    imageMetadata!: unknown | null;

    @ManyToOne(() => TechAptitudeOption, { nullable: true })
    @JoinColumn({ name: "correct_option_id" })
    correctOption?: TechAptitudeOption | null;

    @RelationId((question: TechAptitudeQuestion) => question.correctOption)
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
        transformer: numericTransformer,
    })
    negativeMarks!: number;

    @Column({ name: "explanation", type: "text", nullable: true })
    explanation!: string | null;

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

    @OneToMany(() => TechAptitudeOption, (option) => option.question)
    options!: TechAptitudeOption[];
}

@Entity({ name: "tech_aptitude_options" })
export class TechAptitudeOption {
    @PrimaryGeneratedColumn("increment", { name: "option_id", type: "bigint" })
    optionId!: string;

    @ManyToOne(() => TechAptitudeQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "aptitude_question_id" })
    question!: TechAptitudeQuestion;

    @RelationId((option: TechAptitudeOption) => option.question)
    questionId!: string;

    @Column({ name: "option_text", type: "text" })
    optionText!: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;
}

@Entity({ name: "tech_aptitude_attempts" })
export class TechAptitudeAttempt {
    @PrimaryGeneratedColumn("increment", { name: "aptitude_attempt_id", type: "bigint" })
    aptitudeAttemptId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((attempt: TechAptitudeAttempt) => attempt.assessment)
    assessmentId!: string;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user!: UserEntity;

    @RelationId((attempt: TechAptitudeAttempt) => attempt.user)
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

    @OneToMany(() => TechAptitudeAttemptQuestion, (question) => question.attempt)
    questions!: TechAptitudeAttemptQuestion[];
}

@Entity({ name: "tech_aptitude_attempt_questions" })
@Unique("uq_aptitude_attempt_question", ["attempt", "question"])
export class TechAptitudeAttemptQuestion {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_id", type: "bigint" })
    attemptQuestionId!: string;

    @ManyToOne(() => TechAptitudeAttempt, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "aptitude_attempt_id" })
    attempt!: TechAptitudeAttempt;

    @RelationId((attemptQuestion: TechAptitudeAttemptQuestion) => attemptQuestion.attempt)
    attemptId!: string;

    @ManyToOne(() => TechAptitudeQuestion, { nullable: false })
    @JoinColumn({ name: "aptitude_question_id" })
    question!: TechAptitudeQuestion;

    @RelationId((attemptQuestion: TechAptitudeAttemptQuestion) => attemptQuestion.question)
    questionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;

    @ManyToOne(() => TechAptitudeOption, { nullable: true })
    @JoinColumn({ name: "selected_option_id" })
    selectedOption?: TechAptitudeOption | null;

    @RelationId((attemptQuestion: TechAptitudeAttemptQuestion) => attemptQuestion.selectedOption)
    selectedOptionId?: string | null;

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

    @OneToMany(() => TechAptitudeAttemptQuestionOption, (option) => option.attemptQuestion)
    options!: TechAptitudeAttemptQuestionOption[];
}

@Entity({ name: "tech_aptitude_attempt_question_options" })
@Unique("uq_aptitude_attempt_option", ["attemptQuestion", "option"])
@Unique("uq_aptitude_attempt_option_order", ["attemptQuestion", "displayOrder"])
export class TechAptitudeAttemptQuestionOption {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_option_id", type: "bigint" })
    attemptQuestionOptionId!: string;

    @ManyToOne(() => TechAptitudeAttemptQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "attempt_question_id" })
    attemptQuestion!: TechAptitudeAttemptQuestion;

    @RelationId((entry: TechAptitudeAttemptQuestionOption) => entry.attemptQuestion)
    attemptQuestionId!: string;

    @ManyToOne(() => TechAptitudeOption, { nullable: false })
    @JoinColumn({ name: "option_id" })
    option!: TechAptitudeOption;

    @RelationId((entry: TechAptitudeAttemptQuestionOption) => entry.option)
    optionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;
}
