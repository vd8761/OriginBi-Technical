"use client";

import React from "react";

export type SubmitPhase =
    | "submitting"   // in-flight POST to /submit
    | "retrying"     // last attempt failed; waiting + auto-retrying
    | "succeeded"    // server accepted; transitioning to completion
    | "failed_offline"; // gave up after retries — user can manually retry

interface SubmittingModalProps {
    phase: SubmitPhase;
    attempt: number;
    maxAttempts: number;
    nextRetryInSeconds?: number;
    errorMessage?: string;
    onManualRetry?: () => void;
}

/**
 * Renders while a coding-assessment submission is in flight. Intentionally
 * NOT cancellable — once the user confirms, we either succeed or surface a
 * manual retry button. We never silently drop the submission.
 */
const SubmittingModal: React.FC<SubmittingModalProps> = ({
    phase,
    attempt,
    maxAttempts,
    nextRetryInSeconds,
    errorMessage,
    onManualRetry,
}) => {
    const title = (() => {
        switch (phase) {
            case "submitting":
                return "Submitting your assessment…";
            case "retrying":
                return "Network hiccup — retrying";
            case "succeeded":
                return "Submission received";
            case "failed_offline":
                return "We can't reach the server";
        }
    })();

    const subtitle = (() => {
        switch (phase) {
            case "submitting":
                return attempt > 1
                    ? `Attempt ${attempt} of ${maxAttempts}. Hold tight — please do not close this window.`
                    : "Please do not close or refresh this window.";
            case "retrying":
                return `Retrying in ${nextRetryInSeconds ?? 0}s (attempt ${attempt} of ${maxAttempts}). Your answers are safe.`;
            case "succeeded":
                return "Your answers were saved. Taking you to the results screen…";
            case "failed_offline":
                return (
                    errorMessage ||
                    "Your answers are saved locally. Reconnect to the internet and click Retry — we'll resume from where we left off."
                );
        }
    })();

    return (
        <div
            className="fixed inset-0 z-[260] flex items-center justify-center bg-black/85 backdrop-blur-md"
            // No onClick to dismiss — this modal is non-closable.
            role="dialog"
            aria-modal="true"
            aria-labelledby="submitting-modal-title"
            onKeyDown={(e) => {
                // Block Escape from anywhere within the modal.
                if (e.key === "Escape") e.preventDefault();
            }}
        >
            <div
                className="w-full max-w-[460px] rounded-[20px] p-9 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
                style={{
                    background: "var(--c-card)",
                    border: "1px solid var(--c-border)",
                }}
            >
                <div className="text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                        {phase === "succeeded" ? (
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1ED36A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        ) : phase === "failed_offline" ? (
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#FFB703" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 9v4M12 17h.01" />
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        ) : (
                            <span className="inline-block h-12 w-12 animate-spin rounded-full border-[3px] border-[#1ED36A]/20 border-t-[#1ED36A]" />
                        )}
                    </div>
                    <h2
                        id="submitting-modal-title"
                        className="mb-2 text-[20px] font-extrabold"
                        style={{ color: "var(--c-text)" }}
                    >
                        {title}
                    </h2>
                    <p
                        className="text-[13px] leading-[1.55]"
                        style={{ color: "var(--c-text-soft)" }}
                    >
                        {subtitle}
                    </p>
                </div>

                {phase === "failed_offline" && onManualRetry && (
                    <button
                        type="button"
                        onClick={onManualRetry}
                        className="mt-6 w-full cursor-pointer rounded-full border-0 bg-[#1ED36A] px-3 py-3.5 text-[14px] font-extrabold text-white shadow-[0_4px_20px_rgba(30,211,106,0.35)] transition-transform hover:scale-[1.01]"
                    >
                        Retry submission
                    </button>
                )}
            </div>
        </div>
    );
};

export default SubmittingModal;
