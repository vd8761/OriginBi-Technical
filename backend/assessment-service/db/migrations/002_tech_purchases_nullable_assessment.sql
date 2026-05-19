-- Coding purchases (assessment_code starts with "coding:") don't have a
-- corresponding row in tech_assessments — the coding pricing catalog lives
-- in exam-engine's `pricing_items`. The assessment-service still records an
-- audit row in tech_assessment_purchases for these, with
-- assessment_id = NULL. That insert was failing with a NOT NULL violation
-- so verifyPayment returned 500 to the frontend AFTER Razorpay already
-- charged the user.
--
-- This relaxes the column so the existing fallback works.

ALTER TABLE tech_assessment_purchases
    ALTER COLUMN assessment_id DROP NOT NULL;
