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
import { TechAttemptStatus, TechQuestionStatus, TechRoleQuestionType } from "./enums";
import { numericTransformer } from "./transformers";
import { UserEntity } from "./UserEntity";

@Entity({ name: "tech_role_questions" })
export class TechRoleQuestion {
    @PrimaryGeneratedColumn("increment", { name: "role_question_id", type: "bigint" })
    roleQuestionId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((question: TechRoleQuestion) => question.assessment)
    assessmentId!: string;

    @Column({ name: "domain", type: "varchar", length: 100 })
    domain!: string;

    @Column({
        name: "question_type",
        type: "enum",
        enum: TechRoleQuestionType,
        enumName: "tech_role_question_type",
    })
    questionType!: TechRoleQuestionType;

    @Column({ name: "question_text", type: "text" })
    questionText!: string;

    @Column({ name: "scenario_context", type: "text", nullable: true })
    scenarioContext!: string | null;

    @ManyToOne(() => TechRoleOption, { nullable: true })
    @JoinColumn({ name: "correct_option_id" })
    correctOption?: TechRoleOption | null;

    @RelationId((question: TechRoleQuestion) => question.correctOption)
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

    @OneToMany(() => TechRoleOption, (option) => option.question)
    options!: TechRoleOption[];
}

@Entity({ name: "tech_role_options" })
export class TechRoleOption {
    @PrimaryGeneratedColumn("increment", { name: "option_id", type: "bigint" })
    optionId!: string;

    @ManyToOne(() => TechRoleQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "role_question_id" })
    question!: TechRoleQuestion;

    @RelationId((option: TechRoleOption) => option.question)
    questionId!: string;

    @Column({ name: "option_text", type: "text" })
    optionText!: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;
}

@Entity({ name: "tech_role_attempts" })
export class TechRoleAttempt {
    @PrimaryGeneratedColumn("increment", { name: "role_attempt_id", type: "bigint" })
    roleAttemptId!: string;

    @ManyToOne(() => TechAssessment, { nullable: false })
    @JoinColumn({ name: "assessment_id" })
    assessment!: TechAssessment;

    @RelationId((attempt: TechRoleAttempt) => attempt.assessment)
    assessmentId!: string;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: "user_id" })
    user!: UserEntity;

    @RelationId((attempt: TechRoleAttempt) => attempt.user)
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

    @OneToMany(() => TechRoleAttemptQuestion, (question) => question.attempt)
    questions!: TechRoleAttemptQuestion[];
}

@Entity({ name: "tech_role_attempt_questions" })
@Unique("uq_role_attempt_question", ["attempt", "question"])
export class TechRoleAttemptQuestion {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_id", type: "bigint" })
    attemptQuestionId!: string;

    @ManyToOne(() => TechRoleAttempt, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "role_attempt_id" })
    attempt!: TechRoleAttempt;

    @RelationId((attemptQuestion: TechRoleAttemptQuestion) => attemptQuestion.attempt)
    attemptId!: string;

    @ManyToOne(() => TechRoleQuestion, { nullable: false })
    @JoinColumn({ name: "role_question_id" })
    question!: TechRoleQuestion;

    @RelationId((attemptQuestion: TechRoleAttemptQuestion) => attemptQuestion.question)
    questionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;

    @ManyToOne(() => TechRoleOption, { nullable: true })
    @JoinColumn({ name: "selected_option_id" })
    selectedOption?: TechRoleOption | null;

    @RelationId((attemptQuestion: TechRoleAttemptQuestion) => attemptQuestion.selectedOption)
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

    @OneToMany(() => TechRoleAttemptQuestionOption, (option) => option.attemptQuestion)
    options!: TechRoleAttemptQuestionOption[];
}

@Entity({ name: "tech_role_attempt_question_options" })
@Unique("uq_role_attempt_option", ["attemptQuestion", "option"])
@Unique("uq_role_attempt_option_order", ["attemptQuestion", "displayOrder"])
export class TechRoleAttemptQuestionOption {
    @PrimaryGeneratedColumn("increment", { name: "attempt_question_option_id", type: "bigint" })
    attemptQuestionOptionId!: string;

    @ManyToOne(() => TechRoleAttemptQuestion, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: "attempt_question_id" })
    attemptQuestion!: TechRoleAttemptQuestion;

    @RelationId((entry: TechRoleAttemptQuestionOption) => entry.attemptQuestion)
    attemptQuestionId!: string;

    @ManyToOne(() => TechRoleOption, { nullable: false })
    @JoinColumn({ name: "option_id" })
    option!: TechRoleOption;

    @RelationId((entry: TechRoleAttemptQuestionOption) => entry.option)
    optionId!: string;

    @Column({ name: "display_order", type: "int" })
    displayOrder!: number;
}
