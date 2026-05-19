import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

@Entity({ name: "tech_groups", synchronize: false })
export class TechGroup {
    @PrimaryGeneratedColumn("increment", { name: "id", type: "integer" })
    id!: number;

    @Column({ name: "code", type: "varchar", length: 50, nullable: true })
    code!: string | null;

    @Column({ name: "name", type: "varchar", length: 255 })
    name!: string;

    @Column({ name: "metadata", type: "jsonb", default: () => "'{}'" })
    metadata!: any;

    @Column({ name: "is_active", type: "boolean", default: true })
    isActive!: boolean;

    @Column({ name: "is_deleted", type: "boolean", default: false })
    isDeleted!: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
