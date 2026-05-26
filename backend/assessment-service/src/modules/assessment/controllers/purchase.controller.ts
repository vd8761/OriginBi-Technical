import { Controller, Post, Body } from "@nestjs/common";
import { PurchaseService } from "../services/purchase.service";

@Controller("assessment/purchase")
export class PurchaseController {
    constructor(private readonly purchaseService: PurchaseService) {}

    @Post("purchases")
    async getPurchasedAssessments(@Body() body: { email: string }) {
        return this.purchaseService.getPurchasedAssessments(body.email);
    }

    // Returns the proctoring/exam settings the candidate's exam should run
    // against — the snapshot frozen at purchase time, or the live config when
    // no snapshot exists. The assessment engines call this before starting an
    // attempt so admin edits never alter an already-scheduled exam.
    @Post("effective-settings")
    async getEffectiveSettings(
        @Body() body: { email: string; assessmentCode: string },
    ) {
        return this.purchaseService.getEffectiveAssessmentSettings(
            body.email,
            body.assessmentCode,
        );
    }

    @Post("create-order")
    async createOrder(
        @Body()
        body: {
            email: string;
            assessmentId: string | number;
            assessmentCode: string;
            amount: number;
        },
    ) {
        return this.purchaseService.createOrder(
            body.email,
            body.assessmentId,
            body.assessmentCode,
            body.amount,
        );
    }

    @Post("verify-payment")
    async verifyPayment(
        @Body()
        body: {
            email: string;
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
            assessmentId: string | number;
            assessmentCode: string;
            amount: number;
        },
    ) {
        return this.purchaseService.verifyPayment(body);
    }
}
