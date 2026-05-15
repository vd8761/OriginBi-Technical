"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { AssessmentResult } from "@/lib/progress";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { DM_Serif_Display, Open_Sans } from "next/font/google";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
});

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  userName?: string;
}

const SERIAL_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const getYyMm = (d: Date) => {
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
};

const assessmentCodeFor = (examId: string) => {
  if (examId.startsWith("coding:")) {
    const lang = examId.slice("coding:".length).toLowerCase();
    if (lang === "python") return "PYT";
    if (lang === "java") return "JAV";
    return "COD";
  }

  switch (examId) {
    case "aptitude":
      return "APT";
    case "communication":
      return "COM";
    case "role":
      return "RBA";
    case "mnc":
      return "MNC";
    case "coding":
      return "COD";
    default:
      return examId.slice(0, 3).toUpperCase();
  }
};

const generateRandomCode = (length: number) => {
  const out: string[] = [];
  const size = SERIAL_CHARSET.length;
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const buf = new Uint8Array(length);
    window.crypto.getRandomValues(buf);
    for (let i = 0; i < length; i += 1) {
      out.push(SERIAL_CHARSET[buf[i] % size]);
    }
    return out.join("");
  }
  for (let i = 0; i < length; i += 1) {
    out.push(SERIAL_CHARSET[Math.floor(Math.random() * size)]);
  }
  return out.join("");
};

// ── Icons ──
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const CertificateIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  exam,
  result,
  userName = "Candidate",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !exam || !result) return null;

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      // html2canvas doesn't support cqw units, so we temporarily
      // inline computed styles before capturing
      const el = certificateRef.current;
      const containerWidth = el.offsetWidth;

      // Convert all cqw-based elements to px before capture
      const cqwEls = el.querySelectorAll<HTMLElement>('[data-cqw]');
      const origStyles: { el: HTMLElement; fontSize: string; width: string; height: string; padding: string }[] = [];
      cqwEls.forEach((child) => {
        const cqwVal = child.getAttribute('data-cqw');
        if (!cqwVal) return;
        origStyles.push({
          el: child,
          fontSize: child.style.fontSize,
          width: child.style.width,
          height: child.style.height,
          padding: child.style.padding,
        });
        const vals = cqwVal.split(',');
        vals.forEach((v) => {
          const [prop, cqw] = v.split(':');
          const px = (parseFloat(cqw) / 100) * containerWidth;
          child.style.setProperty(prop.trim(), `${px}px`);
        });
      });

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      // Restore original styles
      origStyles.forEach(({ el: child, fontSize, width, height, padding }) => {
        child.style.fontSize = fontSize;
        child.style.width = width;
        child.style.height = height;
        child.style.padding = padding;
      });

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `OriginBi-${exam.title.replace(/\s+/g, "-")}-Certificate.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate certificate image", error);
      alert("Failed to download certificate. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `I earned a certificate in ${exam.title} with ${result.overallScore}% on OriginBi!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${exam.title} Certificate`,
          text: shareText,
          url: window.location.href,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  // Format date to "Jan 15, 2026"
  const formattedDate = new Date(result.completedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const completedDate = new Date(result.completedAt);
  const dateCode = getYyMm(completedDate);
  const assessmentCode = assessmentCodeFor(exam.id);
  const serialStorageKey = `originbi:cert-serial:${exam.id}:${result.completedAt}`;
  const registrationPrefix = result.module === "tech" ? "TCX" : "OBX";
  let serialNumber = "";

  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(serialStorageKey);
    if (cached) {
      serialNumber = cached;
    } else {
      serialNumber = `${registrationPrefix}-${dateCode}-${assessmentCode}-${generateRandomCode(4)}`;
      window.localStorage.setItem(serialStorageKey, serialNumber);
    }
  } else {
    serialNumber = `${registrationPrefix}-${dateCode}-${assessmentCode}-${generateRandomCode(4)}`;
  }

  const verificationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${serialNumber}`;

  // Helper to determine Grade based on score
  const getGrade = (score: number) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };
  const grade = getGrade(result.overallScore);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-[#0b1511]/80 backdrop-blur-md z-[200]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="fixed inset-0 z-[201] flex items-start sm:items-center justify-center px-3 py-6 sm:p-6 lg:p-8"
          >
            <div
              className="relative w-full max-w-5xl max-h-[92vh] sm:max-h-[95vh] bg-white/95 dark:bg-[#111a15]/95 rounded-2xl shadow-2xl border border-emerald-500/15 dark:border-emerald-400/10 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="shrink-0 bg-white/90 dark:bg-[#19211C]/90 backdrop-blur-sm border-b border-emerald-500/10 dark:border-emerald-400/10 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <CertificateIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Certificate Preview</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{exam.title}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg hover:bg-emerald-500/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <CloseIcon className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                </button>
              </div>

              {/* ── Certificate Display Area ── */}
              <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-start sm:items-center justify-center bg-[#0f1712]/55">
                {/* 
                  We use an aspect ratio container to keep the certificate proportionally correct.
                  2000x1414 -> aspect ratio ~ 1.414.
                  cqw (container query width) allows us to size text perfectly relative to the container width.
                */}
                <div
                  className="relative w-full shadow-2xl bg-white overflow-hidden"
                  style={{
                    aspectRatio: "2000 / 1414",
                    width: "min(92vw, 900px, calc((100vh - 240px) * 1.414))",
                    containerType: "inline-size",
                  }}
                  ref={certificateRef}
                >
                  {/* Background Image - Using standard img for html2canvas compatibility */}
                  <img
                    src="/certificate-template.jpg"
                    alt="Certificate Background"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    crossOrigin="anonymous"
                  />

                  {/* Dynamic Overlay — only dynamic values; all static labels baked into template */}
                  <div
                    className={openSans.className}
                    style={{ position: "absolute", inset: 0, zIndex: 10 }}
                  >

                    {/* ── Date value ── right-aligned flush with "Issue Date" label */}
                    <div
                      style={{
                        position: "absolute",
                        right: "4%",
                        top: "11%",
                        textAlign: "right",
                      }}
                    >
                      <p
                        data-cqw="font-size:3"
                        style={{
                          fontSize: "3cqw",
                          fontWeight: 700,
                          letterSpacing: "0.025em",
                          color: "#ffffff",
                          margin: 0,
                        }}
                      >
                        {formattedDate}
                      </p>
                    </div>

                    {/* ── Title + Description flow container ── */}
                    {/* Using normal flow so description always sits below the title,
                        regardless of how many lines the title wraps to */}
                    <div
                      style={{
                        position: "absolute",
                        left: "7%",
                        top: "27%",
                        width: "75%",
                      }}
                    >
                      {/* Assessment Title */}
                      <h1
                        data-cqw={`font-size:${exam.title.length > 20 ? '5.5' : '7'}`}
                        style={{
                          fontSize: exam.title.length > 20 ? "5.5cqw" : "7cqw",
                          fontWeight: 700,
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                          color: "#ffffff",
                          margin: 0,
                          marginBottom: "2cqw",
                        }}
                      >
                        {exam.title}
                      </h1>

                      {/* Description Paragraph */}
                      <p
                        data-cqw="font-size:2.1"
                        style={{
                          fontSize: "2.1cqw",
                          lineHeight: 1.65,
                          color: "rgba(255, 255, 255, 0.9)",
                          margin: 0,
                        }}
                      >
                        Awarded for successfully completing the assessment with{" "}
                        <span style={{ fontWeight: 700, color: "#34d399" }}>
                          Grade {grade}
                        </span>{" "}
                        performance and an overall score of{" "}
                        <span style={{ fontWeight: 700, color: "#34d399" }}>
                          {result.overallScore}%
                        </span>
                        , demonstrating strong analytical ability, professional
                        competency, and performance excellence.
                      </p>
                    </div>

                    {/* ── Student Name ── below template "Presented to" label */}
                    <div
                      style={{
                        position: "absolute",
                        left: "7%",
                        top: "78%",
                      }}
                    >
                      <h2
                        className={dmSerif.className}
                        data-cqw="font-size:8"
                        style={{
                          fontSize: "8cqw",
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                          color: "#111827",
                          fontStyle: "italic",
                          margin: 0,
                        }}
                      >
                        {userName}
                      </h2>
                    </div>

                    {/* ── QR Code ── below template "Verify Certificate" label */}
                    <div
                      style={{
                        position: "absolute",
                        right: "5%",
                        top: "76%",
                      }}
                    >
                      <div
                        data-cqw="padding:0.8,width:12,height:12"
                        style={{
                          padding: "0.8cqw",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <QRCode
                          value={verificationUrl}
                          size={256}
                          data-cqw="width:11,height:11"
                          style={{ height: "11cqw", width: "11cqw", display: "block" }}
                          level="M"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* ── Action Bar ── */}
              <div className="shrink-0 bg-white/90 dark:bg-[#19211C]/90 backdrop-blur-sm border-t border-emerald-500/10 dark:border-emerald-400/10 px-4 sm:px-6 py-4 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">ID: </span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                        {serialNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShareIcon className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      {isDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          <span>Download High-Res</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Copied Toast */}
              <AnimatePresence>
                {showCopiedToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium shadow-xl border border-gray-200"
                  >
                    Link copied!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget,
  );
};

export default CertificatePreviewModal;

