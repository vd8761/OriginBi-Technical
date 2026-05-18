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

    private isCodingCode(code: string | undefined | null): boolean {
        return !!code && code.toLowerCase().startsWith("coding:");
    }

    /**
     * Returns true if the user identified by `email` was registered by an
     * admin (registrations.registration_source = 'ADMIN'). Admin-registered
     * users get all assessments for free — we short-circuit Razorpay and
     * insert a no-charge purchase row so downstream entitlement checks pass.
     */
    async isAdminRegistered(email: string): Promise<boolean> {
        if (!email) return false;
        try {
            const rows = await this.dataSource.query(
                `SELECT 1
                 FROM registrations r
                 JOIN users u ON u.id = r.user_id
                 WHERE LOWER(u.email) = LOWER($1)
                   AND UPPER(COALESCE(r.registration_source, 'SELF')) = 'ADMIN'
                   AND COALESCE(r.is_deleted, FALSE) = FALSE
                 LIMIT 1`,
                [email],
            );
            return Array.isArray(rows) && rows.length > 0;
        } catch (err: any) {
            this.logger.warn(
                `isAdminRegistered lookup failed for ${email}: ${err.message}`,
            );
            return false;
        }
    }

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
        free?: boolean;
    }> {
        // Admin-registered users skip Razorpay entirely.
        if (await this.isAdminRegistered(email)) {
            this.logger.log(
                `Admin-registered free access: ${email} -> ${assessmentCode}`,
            );
            await this.recordFreePurchase(email, assessmentId, assessmentCode);
            return {
                orderId: `free_admin_${Date.now()}`,
                amount: 0,
                currency: "INR",
                keyId: "",
                free: true,
            };
        }

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

        // Admin-registered users hit this endpoint via the sandbox/free path
        // (PaymentModal still calls verify-payment even after createOrder
        // returns `free: true`). Skip signature verification because no real
        // Razorpay order existed, then record a free purchase.
        const isFreeOrder = body.razorpay_order_id?.startsWith("free_admin_");
        if (isFreeOrder || (await this.isAdminRegistered(body.email))) {
            await this.recordFreePurchase(
                body.email,
                body.assessmentId,
                body.assessmentCode,
            );
            return {
                success: true,
                message: "Free access granted for admin-registered user.",
            };
        }

        if (expectedSignature !== body.razorpay_signature) {
            this.logger.warn(`Signature verification failed for payment of ${body.email}`);
            throw new BadRequestException("Payment signature verification failed");
        }

        // Resolve user_id from users table if available
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

        // Resolve assessment_id robustly (input can be id or code).
        // Coding assessments live in the Go exam-engine (pricing_items) and
        // therefore have no row in tech_assessments — we record the audit
        // row with NULL assessment_id and let the exam-engine grant the
        // actual entitlement via /v1/purchases/demo.
        let resolvedAssessmentId: string | null = null;
        try {
            const byIdRows = await this.dataSource.query(
                `SELECT assessment_id FROM tech_assessments WHERE assessment_id = $1 LIMIT 1`,
                [String(body.assessmentId)]
            );
            if (byIdRows && byIdRows.length > 0) {
                resolvedAssessmentId = String(byIdRows[0].assessment_id);
            } else {
                const byCodeRows = await this.dataSource.query(
                    `SELECT assessment_id FROM tech_assessments WHERE assessment_code = $1 LIMIT 1`,
                    [body.assessmentCode]
                );
                if (byCodeRows && byCodeRows.length > 0) {
                    resolvedAssessmentId = String(byCodeRows[0].assessment_id);
                }
            }
        } catch (err: any) {
            this.logger.warn(`Failed to resolve assessment_id for ${body.assessmentCode}: ${err.message}`);
        }

        if (!resolvedAssessmentId && !this.isCodingCode(body.assessmentCode)) {
            throw new BadRequestException("Invalid assessment reference for purchase");
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Insert purchase record into tech_assessment_purchases table.
            // assessment_id may be NULL for coding rows (see migration that
            // drops NOT NULL on tech_assessment_purchases.assessment_id).
            await queryRunner.query(
                `INSERT INTO tech_assessment_purchases
                    (email, user_id, assessment_id, assessment_code, amount, razorpay_order_id, razorpay_payment_id, status, purchased_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())`,
                [
                    body.email,
                    userId,
                    resolvedAssessmentId,
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
     * Fetch all purchased assessment codes for a user.
     * Admin-registered users are treated as having purchased every assessment.
     */
    async getPurchasedAssessments(email: string): Promise<{ purchased: string[] }> {
        try {
            const rows = await this.dataSource.query(
                `SELECT assessment_code FROM tech_assessment_purchases
                 WHERE LOWER(email) = LOWER($1) AND status = 'active'`,
                [email]
            );

            const purchased = new Set(
                rows.map((row: any) => String(row.assessment_code)),
            );

            if (await this.isAdminRegistered(email)) {
                for (const code of this.knownAssessmentCodes()) {
                    purchased.add(code);
                }
            }

            return { purchased: Array.from(purchased) };
        } catch (err: any) {
            this.logger.error(`Failed to retrieve purchases for ${email}: ${err.message}`);
            return { purchased: [] };
        }
    }

    /**
     * The full catalog of assessment codes the frontend understands. Admin
     * users get all of these without paying. Coding language codes are
     * sourced from the exam-engine pricing seed (009_identity_coding_runtime.sql).
     */
    private knownAssessmentCodes(): string[] {
        return [
            "aptitude",
            "communication",
            "mnc",
            "role",
            "coding:python",
            "coding:java",
            "coding:cpp",
            "coding:javascript",
            "coding:c",
        ];
    }

    /**
     * Idempotently records a zero-amount purchase for an admin-registered user.
     * Safe to call from createOrder (pre-pay short-circuit) and verifyPayment
     * (in case the order path was skipped).
     */
    private async recordFreePurchase(
        email: string,
        assessmentId: string | number | undefined,
        assessmentCode: string,
    ): Promise<void> {
        if (!email || !assessmentCode) return;

        let userId: string | null = null;
        try {
            const userRows = await this.dataSource.query(
                `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
                [email],
            );
            if (userRows && userRows.length > 0) {
                userId = String(userRows[0].id);
            }
        } catch (err: any) {
            this.logger.warn(
                `recordFreePurchase: user lookup failed for ${email}: ${err.message}`,
            );
        }

        let resolvedAssessmentId: string | null = null;
        try {
            const byIdRows = assessmentId
                ? await this.dataSource.query(
                      `SELECT assessment_id FROM tech_assessments WHERE assessment_id = $1 LIMIT 1`,
                      [String(assessmentId)],
                  )
                : [];
            if (byIdRows && byIdRows.length > 0) {
                resolvedAssessmentId = String(byIdRows[0].assessment_id);
            } else {
                const byCodeRows = await this.dataSource.query(
                    `SELECT assessment_id FROM tech_assessments WHERE assessment_code = $1 LIMIT 1`,
                    [assessmentCode],
                );
                if (byCodeRows && byCodeRows.length > 0) {
                    resolvedAssessmentId = String(byCodeRows[0].assessment_id);
                }
            }
        } catch (err: any) {
            this.logger.warn(
                `recordFreePurchase: assessment lookup failed for ${assessmentCode}: ${err.message}`,
            );
        }

        try {
            // Skip if an active row already exists — admins can revisit the
            // same assessment many times and we don't want to bloat the table.
            const existing = await this.dataSource.query(
                `SELECT 1 FROM tech_assessment_purchases
                 WHERE LOWER(email) = LOWER($1)
                   AND assessment_code = $2
                   AND status = 'active'
                 LIMIT 1`,
                [email, assessmentCode],
            );
            if (Array.isArray(existing) && existing.length > 0) {
                return;
            }

            await this.dataSource.query(
                `INSERT INTO tech_assessment_purchases
                    (email, user_id, assessment_id, assessment_code, amount, razorpay_order_id, razorpay_payment_id, status, purchased_at)
                 VALUES ($1, $2, $3, $4, 0, 'free_admin', 'free_admin', 'active', NOW())`,
                [email, userId, resolvedAssessmentId, assessmentCode],
            );
        } catch (err: any) {
            this.logger.warn(
                `recordFreePurchase: insert failed for ${email}/${assessmentCode}: ${err.message}`,
            );
        }
    }
}
