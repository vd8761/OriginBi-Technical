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

    // The tech_assessments configuration columns frozen onto a purchase. One
    // list so the snapshot writer and the live-fallback resolver always read
    // the exact same fields.
    private static readonly SETTINGS_SNAPSHOT_COLUMNS = [
        "total_time_minutes", "total_questions", "question_limit",
        "categories", "difficulty_marks", "difficulty_negative_marks",
        "tab_switch_limit", "anti_copy_enabled", "shuffle_questions", "shuffle_options",
        "negative_mark_enabled", "negative_mark_value",
        "trial_attempts_limit", "main_attempts_limit", "enabled_question_types",
        "proctoring_require_fullscreen", "fullscreen_exit_limit",
        "proctoring_block_devtools", "devtools_open_limit",
        "mouse_focus_loss_limit", "keypress_log_enabled",
        "require_camera_mic", "live_proctoring_enabled",
    ];

    /**
     * Reads the current tech_assessments configuration for an assessment and
     * returns it as a plain object for tech_assessment_purchases.settings_
     * snapshot. Returns null when no row is found (e.g. coding purchases have
     * no tech_assessments row). `exec` lets the caller run it inside an open
     * transaction (queryRunner) or against the pool.
     */
    private async snapshotAssessmentSettings(
        exec: { query: (sql: string, params?: any[]) => Promise<any> },
        assessmentId: string | null,
    ): Promise<Record<string, unknown> | null> {
        if (!assessmentId) return null;
        try {
            const cols = PurchaseService.SETTINGS_SNAPSHOT_COLUMNS.join(", ");
            const rows = await exec.query(
                `SELECT to_jsonb(s) AS snapshot FROM (
                     SELECT ${cols} FROM tech_assessments WHERE assessment_id = $1
                 ) s`,
                [assessmentId],
            );
            if (rows && rows.length > 0 && rows[0].snapshot) {
                return { ...rows[0].snapshot, captured_at: new Date().toISOString() };
            }
        } catch (err: any) {
            this.logger.warn(
                `snapshotAssessmentSettings failed for ${assessmentId}: ${err.message}`,
            );
        }
        return null;
    }

    /**
     * Resolves the proctoring/exam settings a candidate's exam should run
     * against: the snapshot frozen at their most recent active purchase, or
     * the live tech_assessments row when no snapshot exists (legacy purchases
     * or never-purchased assessments). Field names match a tech_assessments
     * row so the frontend's resolveProctoringForPackage consumes it directly.
     */
    async getEffectiveAssessmentSettings(
        email: string,
        assessmentCode: string,
    ): Promise<{ source: "snapshot" | "live" | "none"; settings: Record<string, unknown> | null }> {
        const lookupCode = this.resolveAssessmentLookupCode(assessmentCode);
        if (email) {
            try {
                const snapRows = await this.dataSource.query(
                    `SELECT settings_snapshot
                     FROM tech_assessment_purchases
                     WHERE LOWER(email) = LOWER($1)
                       AND LOWER(assessment_code) IN (LOWER($2), LOWER($3))
                       AND status = 'active'
                       AND settings_snapshot IS NOT NULL
                     ORDER BY purchased_at DESC
                     LIMIT 1`,
                    [email, assessmentCode, lookupCode],
                );
                if (snapRows?.length && snapRows[0].settings_snapshot) {
                    return { source: "snapshot", settings: snapRows[0].settings_snapshot };
                }
            } catch (err: any) {
                this.logger.warn(`effective-settings snapshot lookup failed: ${err.message}`);
            }
        }
        try {
            const cols = PurchaseService.SETTINGS_SNAPSHOT_COLUMNS.join(", ");
            // tech_assessments.assessment_code holds an internal label
            // (TECH_APT_001 …); the module is identified by module_type, which
            // is the candidate-facing code ('aptitude', 'mnc', …) except
            // 'communication' which is stored as 'grammar'.
            const liveRows = await this.dataSource.query(
                `SELECT to_jsonb(s) AS settings FROM (
                     SELECT ${cols} FROM tech_assessments
                     WHERE LOWER(module_type::text) IN (LOWER($1), LOWER($2))
                     LIMIT 1
                 ) s`,
                [assessmentCode, lookupCode],
            );
            if (liveRows?.length && liveRows[0].settings) {
                return { source: "live", settings: liveRows[0].settings };
            }
        } catch (err: any) {
            this.logger.warn(`effective-settings live lookup failed: ${err.message}`);
        }
        return { source: "none", settings: null };
    }

    private resolveAssessmentLookupCode(code: string | number): string {
        const raw = String(code || "").trim().toLowerCase();
        if (raw === "communication") {
            return "grammar";
        }
        return raw;
    }

    private normalizeAssessmentCode(code: string | undefined | null): string {
        const raw = String(code || "").trim().toLowerCase();
        if (raw === "grammar") {
            return "communication";
        }
        return raw;
    }

    private knownBaseAssessmentCodes(): string[] {
        return ["aptitude", "communication", "coding", "mnc", "role"];
    }

    private expandVisibleCodesToUnlockCodes(visibleCodes: Iterable<string>): Set<string> {
        const unlockCodes = new Set<string>();
        for (const code of visibleCodes) {
            const normalized = this.normalizeAssessmentCode(code);
            if (normalized === "coding") {
                for (const knownCode of this.knownAssessmentCodes()) {
                    if (this.isCodingCode(knownCode)) {
                        unlockCodes.add(knownCode);
                    }
                }
                continue;
            }
            unlockCodes.add(normalized);
        }
        return unlockCodes;
    }

    private async getActiveGroupMetadata(email: string): Promise<any | null> {
        if (!email) return null;
        const rows = await this.dataSource.query(
            `SELECT g.metadata
             FROM registrations r
             JOIN users u ON u.id = r.user_id
             JOIN tech_groups g ON g.name = r.metadata->>'groupName'
             WHERE LOWER(u.email) = LOWER($1)
               AND COALESCE(r.is_deleted, FALSE) = FALSE
               AND COALESCE(g.is_active, TRUE) = TRUE
               AND COALESCE(g.is_deleted, FALSE) = FALSE
             ORDER BY r.id DESC
             LIMIT 1`,
            [email],
        );
        return rows?.length ? rows[0].metadata || {} : null;
    }

    private async getGroupAssessmentScope(email: string): Promise<{ visible: Set<string>; free: Set<string> }> {
        const scope = { visible: new Set<string>(), free: new Set<string>() };
        const metadata = await this.getActiveGroupMetadata(email);
        if (!metadata) {
            return scope;
        }

        const assignedAssessments = new Set<string>(
            Array.isArray(metadata.assessments)
                ? metadata.assessments
                      .map((value: unknown) => String(value || "").trim())
                      .filter(Boolean)
                : [],
        );
        if (assignedAssessments.size === 0) {
            return scope;
        }

        const assessmentRows = await this.dataSource.query(
            `SELECT assessment_name, assessment_code, module_type
             FROM tech_assessments`,
        );

        for (const row of assessmentRows as any[]) {
            const assessmentName = String(row.assessment_name || "").trim();
            if (!assignedAssessments.has(assessmentName)) {
                continue;
            }

            const rowCode = this.normalizeAssessmentCode(
                row.module_type || row.assessment_code,
            );
            if (!rowCode) {
                continue;
            }

            scope.visible.add(rowCode === "coding" ? "coding" : rowCode);
        }

        if (metadata.isFree === true) {
            scope.free = this.expandVisibleCodesToUnlockCodes(scope.visible);
        }

        return scope;
    }

    async getUserPricingPolicy(email: string): Promise<"free" | "pay" | null> {
        if (!email) return null;
        try {
            const rows = await this.dataSource.query(
                `SELECT r.metadata
                 FROM registrations r
                 JOIN users u ON u.id = r.user_id
                 WHERE LOWER(u.email) = LOWER($1)
                   AND COALESCE(r.is_deleted, FALSE) = FALSE
                 ORDER BY r.id DESC
                 LIMIT 1`,
                [email],
            );
            if (!rows?.length) {
                return null;
            }
            const metadata = rows[0].metadata || {};
            if (metadata.pricingPolicy === "pay") {
                return "pay";
            }
            if (metadata.pricingPolicy === "free" || metadata.isFree === true || metadata.is_free === true) {
                return "free";
            }
            return null;
        } catch (err: any) {
            this.logger.warn(
                `getUserPricingPolicy lookup failed for ${email}: ${err.message}`,
            );
            return null;
        }
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

    async isUserMarkedFree(email: string): Promise<boolean> {
        return (await this.getUserPricingPolicy(email)) === "free";
    }

    /**
     * Returns true if the candidate identified by `email` is part of a cohort group (tech_groups)
     * which has a FREE pricing policy (metadata.isFree === true) and has the specified
     * assessment assigned to it.
     */
    async isAssessmentFreeForCandidate(email: string, assessmentIdOrCode: string | number): Promise<boolean> {
        if (!email) return false;
        try {
            // 1. Get the groupName the user is registered in
            const regRows = await this.dataSource.query(
                `SELECT r.metadata->>'groupName' as "groupName"
                 FROM registrations r
                 JOIN users u ON u.id = r.user_id
                 WHERE LOWER(u.email) = LOWER($1) AND r.is_deleted = false
                 LIMIT 1`,
                [email]
            );
            if (!regRows || regRows.length === 0 || !regRows[0].groupName) {
                return false;
            }

            const groupName = regRows[0].groupName;

            // 2. Fetch the tech_groups metadata
            const groupRows = await this.dataSource.query(
                `SELECT metadata FROM tech_groups
                 WHERE name = $1 AND is_active = true AND is_deleted = false
                 LIMIT 1`,
                [groupName]
            );
            if (!groupRows || groupRows.length === 0) {
                return false;
            }

            const metadata = groupRows[0].metadata || {};
            if (metadata.isFree !== true) {
                return false;
            }

            // 3. Resolve the assessment name for the given assessmentIdOrCode
            let assessmentName = "";
            const idOrCodeStr = String(assessmentIdOrCode);
            const lookupCode = this.resolveAssessmentLookupCode(idOrCodeStr);

            // If it's a coding language purchase (e.g. coding:python), it maps to the Coding Assessment
            if (lookupCode.startsWith("coding")) {
                const codingRows = await this.dataSource.query(
                    `SELECT assessment_name FROM tech_assessments WHERE module_type = 'coding' LIMIT 1`
                );
                if (codingRows && codingRows.length > 0) {
                    assessmentName = codingRows[0].assessment_name;
                }
            } else {
                let rows: any[] = [];
                const isNumeric = /^\d+$/.test(idOrCodeStr);
                if (isNumeric) {
                    rows = await this.dataSource.query(
                        `SELECT assessment_name FROM tech_assessments WHERE assessment_id = $1 LIMIT 1`,
                        [Number(idOrCodeStr)]
                    );
                } else {
                    rows = await this.dataSource.query(
                        `SELECT assessment_name FROM tech_assessments WHERE assessment_code = $1 OR module_type = $1 LIMIT 1`,
                        [lookupCode]
                    );
                }

                if (rows && rows.length > 0) {
                    assessmentName = rows[0].assessment_name;
                }
            }

            if (!assessmentName) {
                return false;
            }

            // 4. Check if the assessment is assigned to this group
            const assignedAssessments = metadata.assessments || [];
            return Array.isArray(assignedAssessments) && assignedAssessments.includes(assessmentName);
        } catch (err: any) {
            this.logger.warn(`Failed in isAssessmentFreeForCandidate check for ${email}: ${err.message}`);
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
        isFree?: boolean;
        free?: boolean;
    }> {
        // Resolve the actual assessment amount from the database
        let dbAmount = 0;
        try {
            const byIdRows = await this.dataSource.query(
                `SELECT amount FROM tech_assessments WHERE assessment_id = $1 LIMIT 1`,
                [String(assessmentId)]
            );
            if (byIdRows && byIdRows.length > 0) {
                dbAmount = byIdRows[0].amount !== null && byIdRows[0].amount !== undefined ? Number(byIdRows[0].amount) : 0;
            } else {
                const byCodeRows = await this.dataSource.query(
                    `SELECT amount FROM tech_assessments WHERE assessment_code = $1 LIMIT 1`,
                    [assessmentCode]
                );
                if (byCodeRows && byCodeRows.length > 0) {
                    dbAmount = byCodeRows[0].amount !== null && byCodeRows[0].amount !== undefined ? Number(byCodeRows[0].amount) : 0;
                }
            }
        } catch (err: any) {
            this.logger.warn(`Failed to resolve assessment amount for ${assessmentId}/${assessmentCode}: ${err.message}`);
            dbAmount = amount;
        }

        let finalAmount = dbAmount;

        // Check for Group-Based pricing overrides
        let isFree = finalAmount === 0;
        const userPricingPolicy = await this.getUserPricingPolicy(email);

        try {
            if (userPricingPolicy === "free") {
                isFree = true;
                finalAmount = 0;
            }

            // First check the corporate legacy overrides
            if (!isFree && userPricingPolicy !== "pay") {
                const overrideRows = await this.dataSource.query(
                    `SELECT ga.metadata 
                     FROM registrations r 
                     JOIN users u ON r.user_id = u.id 
                     JOIN group_assessments ga ON ga.group_id = r.group_id AND ga.program_id = r.program_id 
                     WHERE LOWER(u.email) = LOWER($1) AND r.is_deleted = false
                     LIMIT 1`,
                    [email]
                );

                if (overrideRows && overrideRows.length > 0) {
                    const metadata = overrideRows[0].metadata || {};
                    if (metadata.isFree === true || metadata.is_free === true) {
                        isFree = true;
                        finalAmount = 0;
                    }
                }
            }

            // Then check the tech-specific cohort groups (tech_groups) which overrides the payment gate completely
            if (!isFree && userPricingPolicy !== "pay") {
                if (await this.isAssessmentFreeForCandidate(email, assessmentCode) || await this.isAssessmentFreeForCandidate(email, assessmentId)) {
                    isFree = true;
                    finalAmount = 0;
                }
            }
        } catch (err: any) {
            this.logger.warn(`Failed to resolve group-based pricing override for ${email}: ${err.message}`);
        }

        // Admin-registered users skip Razorpay entirely.
        const isAdmin = await this.isAdminRegistered(email);
        if (isAdmin) {
            isFree = true;
            finalAmount = 0;
        }

        if (isFree || finalAmount === 0) {
            if (isAdmin) {
                this.logger.log(
                    `Admin-registered free access: ${email} -> ${assessmentCode}`,
                );
                await this.recordFreePurchase(email, assessmentId, assessmentCode);
                return {
                    orderId: `free_admin_${Date.now()}`,
                    amount: 0,
                    currency: "INR",
                    keyId: "",
                    isFree: true,
                    free: true,
                };
            } else {
                this.logger.log(`[PricingOverride] Free tier assessment assigned for ${email}`);
                return {
                    orderId: "free_bypass",
                    amount: 0,
                    currency: "INR",
                    keyId: "",
                    isFree: true,
                    free: true,
                };
            }
        }

        const razorpayKeyId = this.configService.get<string>("RAZORPAY_KEY_ID");
        const razorpayKeySecret = this.configService.get<string>("RAZORPAY_KEY_SECRET");

        if (!razorpayKeyId || !razorpayKeySecret) {
            throw new Error("Payment gateway not configured");
        }

        const amountInPaise = Math.round(finalAmount * 100);
        const currency = "INR";

        const sanitizedCode = assessmentCode.replace(/:/g, "_");
        const receiptId = `ta_${sanitizedCode}_${Date.now()}`.slice(0, 40);

        // Create Razorpay order via API
        const orderData = {
            amount: amountInPaise,
            currency,
            receipt: receiptId,
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
            isFree: false,
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

        // Resolve assessment_id and amount robustly (input can be id or code)
        let resolvedAssessmentId: string | null = null;
        let assessmentAmount = 0;
        try {
            const byIdRows = await this.dataSource.query(
                `SELECT assessment_id, amount FROM tech_assessments WHERE assessment_id = $1 LIMIT 1`,
                [String(body.assessmentId)]
            );
            if (byIdRows && byIdRows.length > 0) {
                resolvedAssessmentId = String(byIdRows[0].assessment_id);
                assessmentAmount = byIdRows[0].amount !== null && byIdRows[0].amount !== undefined ? Number(byIdRows[0].amount) : 0;
            } else {
                const byCodeRows = await this.dataSource.query(
                    `SELECT assessment_id, amount FROM tech_assessments WHERE assessment_code = $1 LIMIT 1`,
                    [body.assessmentCode]
                );
                if (byCodeRows && byCodeRows.length > 0) {
                    resolvedAssessmentId = String(byCodeRows[0].assessment_id);
                    assessmentAmount = byCodeRows[0].amount !== null && byCodeRows[0].amount !== undefined ? Number(byCodeRows[0].amount) : 0;
                }
            }
        } catch (err: any) {
            this.logger.warn(`Failed to resolve assessment_id for ${body.assessmentCode}: ${err.message}`);
        }

        if (!resolvedAssessmentId && !this.isCodingCode(body.assessmentCode)) {
            throw new BadRequestException("Invalid assessment reference for purchase");
        }

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

        // Verify signature (with secure fallback for free-tier bypasses)
        if (body.razorpay_order_id === "free_bypass" || body.razorpay_signature === "signature_free") {
            const userPricingPolicy = await this.getUserPricingPolicy(body.email);
            let hasFreeOverride = assessmentAmount === 0 || userPricingPolicy === "free";

            if (!hasFreeOverride && userPricingPolicy !== "pay") {
                try {
                    const overrideRows = await this.dataSource.query(
                        `SELECT ga.metadata 
                         FROM registrations r 
                         JOIN users u ON r.user_id = u.id 
                         JOIN group_assessments ga ON ga.group_id = r.group_id AND ga.program_id = r.program_id 
                         WHERE LOWER(u.email) = LOWER($1) AND r.is_deleted = false
                         LIMIT 1`,
                        [body.email]
                    );
                    if (overrideRows && overrideRows.length > 0) {
                        const metadata = overrideRows[0].metadata || {};
                        if (metadata.isFree === true || metadata.is_free === true) {
                            hasFreeOverride = true;
                        }
                    }
                } catch (err: any) {
                    this.logger.warn(`Failed to resolve group-based pricing override for ${body.email}: ${err.message}`);
                }
            }

            if (!hasFreeOverride && userPricingPolicy !== "pay") {
                try {
                    if (await this.isAssessmentFreeForCandidate(body.email, body.assessmentCode) || await this.isAssessmentFreeForCandidate(body.email, body.assessmentId)) {
                        hasFreeOverride = true;
                    }
                } catch (err: any) {
                    this.logger.warn(`Failed to resolve group-based pricing override for ${body.email}: ${err.message}`);
                }
            }

            if (!hasFreeOverride) {
                throw new BadRequestException("User does not qualify for free tier assessment");
            }
            this.logger.log(`[PricingOverride] Bypassed Razorpay verification for free tier purchase of ${body.email}`);
        } else {
            const expectedSignature = crypto
                .createHmac("sha256", razorpayKeySecret)
                .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
                .digest("hex");

            if (expectedSignature !== body.razorpay_signature) {
                this.logger.warn(`Signature verification failed for payment of ${body.email}`);
                throw new BadRequestException("Payment signature verification failed");
            }
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

        // `resolvedAssessmentId` and the coding-code guard were already
        // computed before signature verification above — no need to repeat
        // the lookup. Coding has a tech_assessments row for admin settings,
        // but the start entitlement comes from an exam-engine assignment
        // created via /v1/purchases/demo.

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Freeze the assessment configuration as it stands right now, so a
            // later admin edit can't retroactively change this scheduled exam.
            const settingsSnapshot = await this.snapshotAssessmentSettings(
                queryRunner,
                resolvedAssessmentId,
            );

            // Insert purchase record into tech_assessment_purchases table.
            // Legacy or unresolvable coding audit rows may still carry NULL
            // assessment_id, but paid status for coding is assignment-backed.
            await queryRunner.query(
                `INSERT INTO tech_assessment_purchases
                    (email, user_id, assessment_id, assessment_code, amount, razorpay_order_id, razorpay_payment_id, status, settings_snapshot, purchased_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW())`,
                [
                    body.email,
                    userId,
                    resolvedAssessmentId,
                    body.assessmentCode,
                    body.amount,
                    body.razorpay_order_id,
                    body.razorpay_payment_id,
                    settingsSnapshot ? JSON.stringify(settingsSnapshot) : null,
                ]
            );

            if (this.isCodingCode(body.assessmentCode)) {
                const codingExamVersionId = "00000000-0000-0000-0000-000000000601";
                const systemOrgId = "00000000-0000-0000-0000-000000000001";
                const lang = body.assessmentCode.toLowerCase().replace("coding:", "");
                const assignmentId = crypto.randomUUID();
                
                await queryRunner.query(
                    `INSERT INTO exam_assignments (
                        id, exam_version_id, candidate_user_id, assigned_by, assigned_org_id,
                        available_from, available_until, max_attempts, status,
                        assignment_ref, metadata
                     )
                     VALUES (
                        $1, $2, $3, $3, $4,
                        NOW(), NULL, 1, 'active',
                        $5, jsonb_build_object('language', $6::text)
                     )
                     ON CONFLICT (candidate_user_id, assignment_ref)
                         WHERE assignment_ref IS NOT NULL AND status <> 'revoked'
                     DO UPDATE
                     SET status = 'active',
                         available_from = COALESCE(exam_assignments.available_from, EXCLUDED.available_from),
                         available_until = NULL,
                         metadata = CASE
                             WHEN exam_assignments.metadata ? 'settingsSnapshot' THEN exam_assignments.metadata
                             ELSE exam_assignments.metadata || EXCLUDED.metadata
                         END`,
                    [assignmentId, codingExamVersionId, userId, systemOrgId, body.assessmentCode, lang]
                );
            }

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
    async getPurchasedAssessments(email: string): Promise<{ purchased: string[]; visible: string[] }> {
        try {
            const rows = await this.dataSource.query(
                `SELECT assessment_code FROM tech_assessment_purchases
                 WHERE LOWER(email) = LOWER($1)
                   AND status = 'active'
                   AND assessment_code NOT LIKE 'coding:%'`,
                [email]
            );

            const purchased = new Set<string>(
                (rows as any[]).map((row) => String(row.assessment_code)),
            );
            const groupScope = await this.getGroupAssessmentScope(email);
            const userPricingPolicy = await this.getUserPricingPolicy(email);
            const visible = groupScope.visible.size > 0
                ? new Set<string>(groupScope.visible)
                : new Set<string>(this.knownBaseAssessmentCodes());

            const assignmentTable = await this.dataSource.query(
                `SELECT to_regclass('public.exam_assignments') AS table_name`,
            );
            if (assignmentTable?.[0]?.table_name) {
                const assignmentRows = await this.dataSource.query(
                    `SELECT a.assignment_ref AS assessment_code
                     FROM exam_assignments a
                     JOIN users u ON u.id = a.candidate_user_id
                     WHERE LOWER(u.email) = LOWER($1)
                       AND a.assignment_ref LIKE 'coding:%'
                       AND a.status::text = 'active'`,
                    [email],
                );
                for (const row of assignmentRows as any[]) {
                    if (row.assessment_code) {
                        purchased.add(String(row.assessment_code));
                    }
                }
            }

            if (await this.isAdminRegistered(email)) {
                for (const code of this.knownAssessmentCodes()) {
                    purchased.add(code);
                }
                this.knownBaseAssessmentCodes().forEach((code) => visible.add(code));
            } else if (userPricingPolicy === "free") {
                this.expandVisibleCodesToUnlockCodes(visible).forEach((code) => purchased.add(code));
            } else if (userPricingPolicy !== "pay") {
                groupScope.free.forEach((code) => purchased.add(code));
            }

            return { purchased: Array.from(purchased), visible: Array.from(visible) };
        } catch (err: any) {
            this.logger.error(`Failed to retrieve purchases for ${email}: ${err.message}`);
            return { purchased: [], visible: this.knownBaseAssessmentCodes() };
        }
    }

    /**
     * The full catalog of assessment codes the frontend understands. Admin
     * users get all non-coding assessments without paying. Coding language
     * access is sourced from exam-engine assignments, because the assignment
     * is the entitlement that lets a candidate actually start the coding test.
     */
    private knownAssessmentCodes(): string[] {
        return [
            "aptitude",
            "communication",
            "mnc",
            "role",
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

            const settingsSnapshot = await this.snapshotAssessmentSettings(
                this.dataSource,
                resolvedAssessmentId,
            );
            await this.dataSource.query(
                `INSERT INTO tech_assessment_purchases
                    (email, user_id, assessment_id, assessment_code, amount, razorpay_order_id, razorpay_payment_id, status, settings_snapshot, purchased_at)
                 VALUES ($1, $2, $3, $4, 0, 'free_admin', 'free_admin', 'active', $5, NOW())`,
                [
                    email,
                    userId,
                    resolvedAssessmentId,
                    assessmentCode,
                    settingsSnapshot ? JSON.stringify(settingsSnapshot) : null,
                ],
            );

            if (this.isCodingCode(assessmentCode)) {
                const codingExamVersionId = "00000000-0000-0000-0000-000000000601";
                const systemOrgId = "00000000-0000-0000-0000-000000000001";
                const lang = assessmentCode.toLowerCase().replace("coding:", "");
                const assignmentId = crypto.randomUUID();
                
                await this.dataSource.query(
                    `INSERT INTO exam_assignments (
                        id, exam_version_id, candidate_user_id, assigned_by, assigned_org_id,
                        available_from, available_until, max_attempts, status,
                        assignment_ref, metadata
                     )
                     VALUES (
                        $1, $2, $3, $3, $4,
                        NOW(), NULL, 1, 'active',
                        $5, jsonb_build_object('language', $6::text)
                     )
                     ON CONFLICT (candidate_user_id, assignment_ref)
                         WHERE assignment_ref IS NOT NULL AND status <> 'revoked'
                     DO UPDATE
                     SET status = 'active',
                         available_from = COALESCE(exam_assignments.available_from, EXCLUDED.available_from),
                         available_until = NULL,
                         metadata = CASE
                             WHEN exam_assignments.metadata ? 'settingsSnapshot' THEN exam_assignments.metadata
                             ELSE exam_assignments.metadata || EXCLUDED.metadata
                         END`,
                    [assignmentId, codingExamVersionId, userId, systemOrgId, assessmentCode, lang]
                );
            }
        } catch (err: any) {
            this.logger.warn(
                `recordFreePurchase: insert failed for ${email}/${assessmentCode}: ${err.message}`,
            );
        }
    }
}
