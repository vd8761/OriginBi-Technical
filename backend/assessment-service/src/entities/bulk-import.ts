import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("bulk_imports")
export class BulkImportEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ name: "created_by", type: "bigint", nullable: true })
    createdById!: string; // Using string for bigint to avoid overflow issues

    @Column({ type: "varchar", length: 255, nullable: true })
    filename?: string | null;

    @Column({ name: "total_records", type: "int", default: 0 })
    totalRecords!: number;

    @Column({ name: "processed_count", type: "int", default: 0 })
    processedCount!: number;

    @Column({ type: "varchar", length: 20, default: "DRAFT" })
    status!: string;

    @Column({ name: "validation_version", type: "varchar", length: 10, default: "v1" })
    validationVersion!: string;

    @CreateDateColumn({ name: "created_at", type: "timestamptz" })
    createdAt!: Date;

    @Column({ name: "completed_at", type: "timestamptz", nullable: true })
    completedAt?: Date | null;
}

@Entity("bulk_import_rows")
export class BulkImportRowEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ name: "import_id", type: "uuid" })
    importId!: string;

    @Column({ name: "row_index", type: "int" })
    rowIndex!: number;

    @Column({ name: "raw_data", type: "jsonb", nullable: true })
    rawData!: any;

    @Column({ name: "normalized_data", type: "jsonb", nullable: true })
    normalizedData!: any;

    @Column({ type: "varchar", length: 20, default: "PENDING" })
    status!: string;

    @Column({ name: "result_type", type: "varchar", length: 50, nullable: true })
    resultType?: string | null;

    @Column({ name: "error_message", type: "text", nullable: true })
    errorMessage?: string | null;

    @Column({ name: "group_match_score", type: "int", nullable: true })
    groupMatchScore?: number | null;

    @Column({ name: "matched_group_id", type: "bigint", nullable: true })
    matchedGroupId?: string | null;

    @Column({ type: "boolean", default: false })
    overridden!: boolean;

    @Column({ name: "override_data", type: "jsonb", nullable: true })
    overrideData?: any | null;
}
