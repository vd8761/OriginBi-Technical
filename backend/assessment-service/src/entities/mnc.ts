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

@Entity({ name: "tech_mnc_questions" })
export class TechMncQuestion {
    @PrimaryGeneratedColumn("increment", { name: "mnc_question_id", type: "bigint" })
    mncQuestionId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((question: TechMncQuestion) => question.assessment)
    assessmentId!: string;

    @Column({ name: "topic_group", type: "varchar", length: 100 })
    topicGroup!: string;

    @Column({
        name: "difficulty",
        type: "enum",
        enum: TechDifficulty,
        enumName: "tech_difficulty",
    })
    difficulty!: TechDifficulty;

    @Column({ name: "question_text", type: "text" })
    questionText!: string;

    @ManyToOne(() => TechMncOption, { nullable: true })
    @JoinColumn({ name: "correct_option_id" })
    correctOption?: TechMncOption | null;

    @RelationId((question: TechMncQuestion) => question.correctOption)
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

    @OneToMany(() => TechMncOption, (option) => option.question)
    options!: TechMncOption[];
}

@Entity({ name: "tech_mnc_options" })
export class TechMncOption {
    @PrimaryGeneratedColumn("increment", { name: "option_id", type: "bigint" })
    optionId!: string;

    @ManyToOne(() => TechMncQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "mnc_question_id" })
    question!: TechMncQuestion;

    @RelationId((option: TechMncOption) => option.question)
    questionId!: string;

    @Column({ name: "option_text", type: "text" })
    optionText!: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;
}

@Entity({ name: "tech_mnc_attempts" })
export class TechMncAttempt {
    @PrimaryGeneratedColumn("increment", { name: "mnc_attempt_id", type: "bigint" })
    mncAttemptId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((attempt: TechMncAttempt) => attempt.assessment)
    assessmentId!: string;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user!: UserEntity;

    @RelationId((attempt: TechMncAttempt) => attempt.user)
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

    @OneToMany(() => TechMncAttemptQuestion, (question) => question.attempt)
    questions!: TechMncAttemptQuestion[];
}

@Entity({ name: "tech_mnc_attempt_questions" })
@Unique("uq_mnc_attempt_question", ["attempt", "question"])
export class TechMncAttemptQuestion {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_id", type: "bigint" })
    attemptQuestionId!: string;

    @ManyToOne(() => TechMncAttempt, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "mnc_attempt_id" })
    attempt!: TechMncAttempt;

    @RelationId((attemptQuestion: TechMncAttemptQuestion) => attemptQuestion.attempt)
    attemptId!: string;

    @ManyToOne(() => TechMncQuestion, { nullable: false })
    @JoinColumn({ name: "mnc_question_id" })
    question!: TechMncQuestion;

    @RelationId((attemptQuestion: TechMncAttemptQuestion) => attemptQuestion.question)
    questionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;

    @ManyToOne(() => TechMncOption, { nullable: true })
    @JoinColumn({ name: "selected_option_id" })
    selectedOption?: TechMncOption | null;

    @RelationId((attemptQuestion: TechMncAttemptQuestion) => attemptQuestion.selectedOption)
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

    @OneToMany(() => TechMncAttemptQuestionOption, (option) => option.attemptQuestion)
    options!: TechMncAttemptQuestionOption[];
}

@Entity({ name: "tech_mnc_attempt_question_options" })
@Unique("uq_mnc_attempt_option", ["attemptQuestion", "option"])
@Unique("uq_mnc_attempt_option_order", ["attemptQuestion", "displayOrder"])
export class TechMncAttemptQuestionOption {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_option_id", type: "bigint" })
    attemptQuestionOptionId!: string;

    @ManyToOne(() => TechMncAttemptQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "attempt_question_id" })
    attemptQuestion!: TechMncAttemptQuestion;

    @RelationId((entry: TechMncAttemptQuestionOption) => entry.attemptQuestion)
    attemptQuestionId!: string;

    @ManyToOne(() => TechMncOption, { nullable: false })
    @JoinColumn({ name: "option_id" })
    option!: TechMncOption;

    @RelationId((entry: TechMncAttemptQuestionOption) => entry.option)
    optionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;
}
