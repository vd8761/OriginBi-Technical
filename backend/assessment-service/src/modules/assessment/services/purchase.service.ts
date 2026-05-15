import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { TechAssessmentPurchase } from "../../../entities/TechAssessmentPurchase";
import * as crypto from "crypto";

@Injectable()
export class PurchaseService {
    private readonly logger = new Logger(PurchaseService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Create a Razorpay order for Technical Assessment purchase
     */
    async createOrder(
        email: string,
        assessmentId: string | number,
        assessmentCode: string,
        amount: number,
    ): Promise<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }> {
        const razorpayKeyId = this.configService.get<string>("RAZORPAY_KEY_ID");
        const razorpayKeySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

        if (!razorpayKeyId || !razorpayKeySecret) {
            throw new Error("Payment gateway not configured");
        }

        const amountInPaise = Math.round(amount * 100);
        const currency = "INR";

        // Create Razorpay order via API
        const orderData = {
            amount: amountInPaise,
            currency,
            receipt: `tech_assess_${assessmentCode}_${String(Date.now())}`,
            notes: { email, plan: "tech_assessment", assessmentId: String(assessmentId), assessmentCode },
        };

        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    "Basic " +
                    Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString(
                        "base64",
                    ),
            },
            body: JSON.stringify(orderData),
        });

        if (!response.ok) {
            const errText = await response.text();
            this.logger.error(`Razorpay order creation failed: ${errText}`);
            throw new Error("Failed to create order on payment gateway");
        }

        const order = (await response.json()) as { id: string; amount: number; currency: string };

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: razorpayKeyId,
        };
    }

    /**
     * Verify payment signature and persist purchase record to database
     */
    async verifyPayment(body: {
        email: string;
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        assessmentId: string | number;
        assessmentCode: string;
        amount: number;
    }): Promise<{ success: boolean; message: string }> {
        const razorpayKeySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

        if (!razorpayKeySecret) {
            throw new Error("Payment gateway not configured");
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac("sha256", razorpayKeySecret)
            .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== body.razorpay_signature) {
            this.logger.warn(`Signature verification failed for payment of ${body.email}`);
            throw new BadRequestException("Payment signature verification failed");
        }

        // Fetch user from users table if available to get user_id
        let userId: string | null = null;
        try {
            const userRows = await this.dataSource.query(
                `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
                [body.email]
            );
            if (userRows && userRows.length > 0) {
                userId = String(userRows[0].id);
            }
        } catch (err: any) {
            this.logger.warn(`Failed to resolve user_id for ${body.email}: ${err.message}`);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Insert purchase record into tech_assessment_purchases table
            await queryRunner.query(
                `INSERT INTO tech_assessment_purchases
                    (email, user_id, assessment_id, assessment_code, amount, razorpay_order_id, razorpay_payment_id, status, purchased_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())`,
                [
                    body.email,
                    userId,
                    String(body.assessmentId),
                    body.assessmentCode,
                    body.amount,
                    body.razorpay_order_id,
                    body.razorpay_payment_id,
                ]
            );

            await queryRunner.commitTransaction();

            this.logger.log(
                `✅ Tech Assessment ${body.assessmentCode} purchased by ${body.email} successfully!`
            );

            return {
                success: true,
                message: "Purchase verified and activated successfully!",
            };
        } catch (err: any) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Database persistence failed: ${err.message}`);
            throw new Error(`Failed to activate purchase: ${err.message}`);
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Fetch all purchased assessment codes for a user
     */
    async getPurchasedAssessments(email: string): Promise<{ purchased: string[] }> {
        try {
            const rows = await this.dataSource.query(
                `SELECT assessment_code FROM tech_assessment_purchases 
                 WHERE LOWER(email) = LOWER($1) AND status = 'active'`,
                [email]
            );

            const purchased = rows.map((row: any) => String(row.assessment_code));
            return { purchased };
        } catch (err: any) {
            this.logger.error(`Failed to retrieve purchases for ${email}: ${err.message}`);
            return { purchased: [] };
        }
    }
}
