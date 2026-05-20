import {
    Column,
    CreateDateColumn,
    Check,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn,
} from "typeorm";
import { TechAssessmentStatus, TechModuleType } from "./enums";
import { numericTransformer } from "./transformers";
import { UserEntity } from "./UserEntity";

@Entity({ name: "tech_assessments" })
@Index("idx_tech_assessments_module", ["moduleType"])
@Check(
    "chk_tech_assessments_negative_mark",
    "((negative_mark_enabled = false AND negative_mark_value IS NULL) OR (negative_mark_enabled = true AND negative_mark_value IS NOT NULL))"
)
export class TechAssessment {
    @PrimaryGeneratedColumn("increment", { name: "assessment_id", type: "bigint" })
    assessmentId!: string;

    @Column({ name: "assessment_code", type: "varchar", length: 50, unique: true })
    assessmentCode!: string;

    @Column({ name: "assessment_name", type: "varchar", length: 150 })
    assessmentName!: string;

    @Column({
        name: "module_type",
        type: "enum",
        enum: TechModuleType,
        enumName: "tech_module_type",
    })
    moduleType!: TechModuleType;

    @Column({ name: "total_time_minutes", type: "int" })
    totalTimeMinutes!: number;

    @Column({ name: "total_questions", type: "int" })
    totalQuestions!: number;

    @Column({ name: "question_limit", type: "int", default: 0 })
    questionLimit!: number;

    @Column({ name: "categories", type: "jsonb", nullable: true })
    categories!: any;

    @Column({ name: "difficulty_marks", type: "jsonb", nullable: true })
    difficultyMarks!: any;

    @Column({ name: "difficulty_negative_marks", type: "jsonb", nullable: true })
    difficultyNegativeMarks!: any;

    @Column({ name: "tab_switch_limit", type: "int", default: 0 })
    tabSwitchLimit!: number;

    @Column({ name: "anti_copy_enabled", type: "boolean", default: false })
    antiCopyEnabled!: boolean;

    @Column({ name: "shuffle_questions", type: "boolean" })
    shuffleQuestions!: boolean;

    @Column({ name: "shuffle_options", type: "boolean" })
    shuffleOptions!: boolean;

    @Column({ name: "negative_mark_enabled", type: "boolean" })
    negativeMarkEnabled!: boolean;

    @Column({
        name: "negative_mark_value",
        type: "decimal",
        precision: 5,
        scale: 2,
        nullable: true,
        transformer: numericTransformer,
    })
    negativeMarkValue!: number | null;

    @Column({
        name: "status",
        type: "enum",
        enum: TechAssessmentStatus,
        enumName: "tech_assessment_status",
    })
    status!: TechAssessmentStatus;

    @Column({
        name: "amount",
        type: "decimal",
        precision: 10,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    amount!: number;

    @Column({ name: "trial_attempts_limit", type: "int", default: 5 })
    trialAttemptsLimit!: number;

    @Column({ name: "main_attempts_limit", type: "int", default: 2 })
    mainAttemptsLimit!: number;

    @Column({ name: "enabled_question_types", type: "jsonb", nullable: true })
    enabledQuestionTypes!: any;

    @Column({ name: "proctoring_require_fullscreen", type: "boolean", default: false })
    proctoringRequireFullscreen!: boolean;

    @Column({ name: "fullscreen_exit_limit", type: "int", default: 0 })
    fullscreenExitLimit!: number;

    @Column({ name: "proctoring_block_devtools", type: "boolean", default: true })
    proctoringBlockDevtools!: boolean;

    @Column({ name: "devtools_open_limit", type: "int", default: 0 })
    devtoolsOpenLimit!: number;

    @Column({ name: "mouse_focus_loss_limit", type: "int", default: 0 })
    mouseFocusLossLimit!: number;

    @Column({ name: "keypress_log_enabled", type: "boolean", default: false })
    keypressLogEnabled!: boolean;

    @Column({ name: "require_camera_mic", type: "boolean", default: false })
    requireCameraMic!: boolean;

    @Column({ name: "live_proctoring_enabled", type: "boolean", default: true })
    liveProctoringEnabled!: boolean;

    @Column({ name: "adaptive_enabled", type: "boolean", default: false })
    adaptiveEnabled!: boolean;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: "created_by" })
    createdBy!: UserEntity;

    @RelationId((assessment: TechAssessment) => assessment.createdBy)
    createdById!: string;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
    updatedAt!: Date;
}
