import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./transformers";

@Entity({ name: "tech_assessment_purchases", synchronize: false })
export class TechAssessmentPurchase {
    @PrimaryGeneratedColumn("increment", { name: "id", type: "bigint" })
    id!: string;

    @Column({ name: "email", type: "varchar", length: 255 })
    email!: string;

    @Column({ name: "user_id", type: "bigint", nullable: true })
    userId!: string | null;

    @Column({ name: "assessment_id", type: "bigint" })
    assessmentId!: string;

    @Column({ name: "assessment_code", type: "varchar", length: 100 })
    assessmentCode!: string;

    @Column({
        name: "amount",
        type: "decimal",
        precision: 10,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    })
    amount!: number;

    @Column({ name: "razorpay_order_id", type: "varchar", length: 150, nullable: true })
    razorpayOrderId!: string | null;

    @Column({ name: "razorpay_payment_id", type: "varchar", length: 150, nullable: true })
    razorpayPaymentId!: string | null;

    @Column({ name: "status", type: "varchar", length: 50, default: "active" })
    status!: string;

    @CreateDateColumn({ name: "purchased_at" })
    purchasedAt!: Date;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
