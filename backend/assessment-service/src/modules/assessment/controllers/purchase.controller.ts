import { Controller, Post, Body } from "@nestjs/common";
import { PurchaseService } from "../services/purchase.service";

@Controller("assessment/purchase")
export class PurchaseController {
    constructor(private readonly purchaseService: PurchaseService) {}

    @Post("purchases")
    async getPurchasedAssessments(@Body() body: { email: string }) {
        return this.purchaseService.getPurchasedAssessments(body.email);
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
