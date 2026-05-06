import {
    Column,
    CreateDateColumn,
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
