"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { AssessmentResult } from "@/lib/progress";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { validateCertificateEligibility, getUserId } from "@/lib/assessmentSecurity";
import { DM_Serif_Display, Open_Sans } from "next/font/google";

const dmSerif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
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

/**
 * Returns a dynamic certificate description tailored to each assessment type.
 * Strictly 3 lines â€” modelled on the aptitude template word count.
 * Format: "Awarded for successfully completing the [Title], [domain phrase] with
 * Grade [X] performance [Y]%, demonstrating exceptional proficiency and professional competency."
 */
const getCertificateDescription = (
  examId: string,
  examTitle: string,
  grade: string,
  score: number
): string => {
  // Domain phrase is kept short so the full sentence fits in 3 lines
  // at 2.1cqw font size in a 75%-width container.
  const domainPhrase = (() => {
    if (examId.startsWith("coding:")) {
      const lang = examId.slice("coding:".length);
      const langName =
        lang === "python" ? "Python" :
        lang === "java"   ? "Java"   :
        lang === "cpp"    ? "C++"    :
        lang === "javascript" ? "JavaScript" :
        lang === "c"      ? "C"      :
        lang.toUpperCase();
      return `validating programming and problem-solving skills in ${langName}`;
    }
    switch (examId) {
      case "aptitude":
        return "evaluating logical reasoning and numerical agility";
      case "communication":
        return "assessing communication and professional writing skills";
      case "coding":
        return "validating programming and problem-solving skills";
      case "mnc":
        return "assessing aptitude and MNC professional readiness";
      case "role":
        return "evaluating role-based judgment and decision-making";
      default:
        return "evaluating core competencies and professional skills";
    }
  })();

  return `Awarded for successfully completing the ${examTitle}, ${domainPhrase} with Grade ${grade} and ${score}% score, demonstrating professional competency.`;
};

const getVerificationUrl = (exam: Exam, result: AssessmentResult) => {
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

  return {
    serialNumber,
    verificationUrl: `https://evaluation.originbi.com/verify/${serialNumber}?token=${result.attemptToken || (result as any).token || ""}&module=${exam.id}`,
  };
};

// â”€â”€ Icons â”€â”€
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

/**
 * Resets all CSS custom properties that use oklch() to plain hex equivalents
 * so that html2canvas can render the certificate without errors.
 * These variables are defined in globals.css and inherited by all DOM nodes.
 */
const OKLCH_RESET_STYLE: React.CSSProperties = {
  // Override every oklch variable with a safe hex fallback
  ["--background" as string]: "#ffffff",
  ["--foreground" as string]: "#111827",
  ["--card" as string]: "#ffffff",
  ["--card-foreground" as string]: "#111827",
  ["--popover" as string]: "#ffffff",
  ["--popover-foreground" as string]: "#111827",
  ["--primary" as string]: "#1f2937",
  ["--primary-foreground" as string]: "#f9fafb",
  ["--secondary" as string]: "#f3f4f6",
  ["--secondary-foreground" as string]: "#1f2937",
  ["--muted" as string]: "#f3f4f6",
  ["--muted-foreground" as string]: "#6b7280",
  ["--accent" as string]: "#f3f4f6",
  ["--accent-foreground" as string]: "#1f2937",
  ["--destructive" as string]: "#ef4444",
  ["--border" as string]: "#e5e7eb",
  ["--input" as string]: "#e5e7eb",
  ["--ring" as string]: "#9ca3af",
  ["--chart-1" as string]: "#d1d5db",
  ["--chart-2" as string]: "#6b7280",
  ["--chart-3" as string]: "#4b5563",
  ["--chart-4" as string]: "#374151",
  ["--chart-5" as string]: "#1f2937",
  ["--sidebar" as string]: "#f9fafb",
  ["--sidebar-foreground" as string]: "#111827",
  ["--sidebar-primary" as string]: "#1f2937",
  ["--sidebar-primary-foreground" as string]: "#f9fafb",
  ["--sidebar-accent" as string]: "#f3f4f6",
  ["--sidebar-accent-foreground" as string]: "#1f2937",
  ["--sidebar-border" as string]: "#e5e7eb",
  ["--sidebar-ring" as string]: "#9ca3af",
};

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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !exam || !result) {
      setQrDataUrl("");
      return;
    }

    const { verificationUrl } = getVerificationUrl(exam, result);

    const timer = setTimeout(() => {
      const svg = document.getElementById("certificate-hidden-qr-svg") as SVGSVGElement | null;
      if (!svg) {
        console.warn("Hidden QR SVG not found in DOM");
        return;
      }

      try {
        if (!svg.getAttribute("xmlns")) {
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        }
        const svgStr = new XMLSerializer().serializeToString(svg);
        const dataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);

        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 256, 256);
            ctx.drawImage(image, 0, 0, 256, 256);
            setQrDataUrl(canvas.toDataURL("image/png"));
          }
        };
        image.onerror = (err) => {
          console.error("Error loading SVG image for QR code conversion", err);
        };
        image.src = dataUri;
      } catch (err) {
        console.error("Failed to convert hidden QR SVG to data URL", err);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, exam, result]);

  // If userName is an email, extract name before '@' and replace punctuation with spaces
  const cleanUserName = (name: string): string => {
    if (!name) return "Candidate";
    if (name.includes("@")) {
      const localPart = name.split("@")[0];
      return localPart
        .replace(/[._-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return name;
  };
  const displayName = cleanUserName(userName);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !exam || !result) return null;

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  const rawTitle = exam.title || "";
  const cleanTitle = rawTitle
    .replace(/\b(adaptive|block-based|block\s+based|block)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || rawTitle;

  // Format date to "Jan 15, 2026"
  const formattedDate = new Date(result.completedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const { serialNumber, verificationUrl } = getVerificationUrl(exam, result);

  // Helper to determine Grade based on score
  const getGrade = (score: number) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };
  const grade = getGrade(result.overallScore);

  // Dynamic description based on assessment type
  const certDescription = getCertificateDescription(exam.id, cleanTitle, grade, result.overallScore);

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    const origStyles: { el: HTMLElement; originalValues: Record<string, string> }[] = [];

    try {
      const el = certificateRef.current;
      const containerWidth = el.offsetWidth;

      // Step 1: resolve cqw values to px so html2canvas captures them
      el.querySelectorAll<HTMLElement>("[data-cqw]").forEach((child) => {
        const cqwVal = child.getAttribute("data-cqw");
        if (!cqwVal) return;

        const originalValues: Record<string, string> = {};
        const propsToConvert = cqwVal.split(",");
        propsToConvert.forEach((v) => {
          const [prop] = v.split(":");
          originalValues[prop.trim()] = child.style.getPropertyValue(prop.trim());
        });
        origStyles.push({ el: child, originalValues });
        propsToConvert.forEach((v) => {
          const [prop, cqw] = v.split(":");
          const px = (parseFloat(cqw) / 100) * containerWidth;
          child.style.setProperty(prop.trim(), `${px}px`);
        });
      });

      // Step 2: capture at 3x scale for crisp PDF output
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Step 3: build PDF
      const PDF_W_MM = 297;
      const PDF_H_MM = 210;
      const imgAspect = canvas.width / canvas.height;
      let imgW = PDF_W_MM;
      let imgH = PDF_W_MM / imgAspect;
      if (imgH > PDF_H_MM) {
        imgH = PDF_H_MM;
        imgW = PDF_H_MM * imgAspect;
      }
      const offsetX = (PDF_W_MM - imgW) / 2;
      const offsetY = (PDF_H_MM - imgH) / 2;

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", offsetX, offsetY, imgW, imgH);
      pdf.save(`${serialNumber}.pdf`);
    } catch (error) {
      console.error("Failed to generate certificate PDF", error);
      alert("Failed to download certificate. Please try again.");
    } finally {
      // Always restore cqw styles
      origStyles.forEach(({ el: child, originalValues }) => {
        Object.entries(originalValues).forEach(([propName, originalValue]) => {
          if (originalValue) {
            child.style.setProperty(propName, originalValue);
          } else {
            child.style.removeProperty(propName);
          }
        });
      });

      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `I earned a certificate in ${cleanTitle} with ${result.overallScore}% on OriginBi!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${cleanTitle} Certificate`,
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
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{cleanTitle}</p>
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
                  Outer wrapper resets all oklch CSS variables to plain hex values.
                  html2canvas reads computed styles and chokes on oklch(); by setting
                  these variables here they cascade into every child element captured.
                */}
                <div style={OKLCH_RESET_STYLE}>
                  <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@1&display=swap');
                  `}</style>
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
                      className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
                      crossOrigin="anonymous"
                      draggable={false}
                    />

                    {/* Dynamic Overlay — only dynamic values; all static labels baked into template */}
                    <div
                      className={openSans.className}
                      style={{ position: "absolute", inset: 0, zIndex: 10 }}
                    >

                      {/* ── Date value ── */}
                      <div
                        style={{
                          position: "absolute",
                          right: "7%",
                          top: "12%",
                          textAlign: "right",
                        }}
                      >
                        <p
                          data-cqw="font-size:2.8"
                          style={{
                            fontSize: "2.8cqw",
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
                          data-cqw={`font-size:${cleanTitle.length > 20 ? "5.5" : "7"}`}
                          style={{
                            fontSize: cleanTitle.length > 20 ? "5.5cqw" : "7cqw",
                            fontWeight: 700,
                            lineHeight: 1.15,
                            letterSpacing: "-0.02em",
                            color: "#ffffff",
                            margin: 0,
                            marginBottom: "2cqw",
                          }}
                        >
                          {cleanTitle}
                        </h1>

                        {/* Dynamic Description Paragraph */}
                        <p
                          data-cqw="font-size:2.1"
                          style={{
                            fontSize: "2.1cqw",
                            lineHeight: 1.65,
                            color: "rgba(255, 255, 255, 0.9)",
                            margin: 0,
                          }}
                        >
                          {/* Split the description to highlight grade and score in green */}
                          {certDescription
                            .split(/(Grade [A-F]|\d+%)/)
                            .map((part, i) =>
                              /Grade [A-F]|\d+%/.test(part) ? (
                                <span key={i} style={{ fontWeight: 700, color: "#34d399" }}>
                                  {part}
                                </span>
                              ) : (
                                part
                              )
                            )}
                        </p>
                      </div>

                      {/* ── Student Name ── */}
                      <div
                        data-cqw="top:51.5"
                        style={{
                          position: "absolute",
                          left: "7%",
                          top: "56.0cqw",
                        }}
                      >
                        <h2
                          data-cqw="font-size:7.2"
                          style={{
                            fontFamily: "'DM Serif Display', serif",
                            fontSize: "7.2cqw",
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                            color: "#111827",
                            fontStyle: "italic",
                            fontWeight: 400,
                            margin: 0,
                            textTransform: "none",
                          }}
                        >
                          {displayName
                            .split(" ")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(" ")}
                        </h2>
                      </div>

                      {/* ── QR Code ── */}
                      <div
                        style={{
                          position: "absolute",
                          right: "6.2%",
                          top: "73%",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      >
                        <div
                          data-cqw="padding:0.8,width:12,height:12"
                          style={{
                            padding: "0.8cqw",
                            backgroundColor: "#ffffff",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        >
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              data-cqw="width:11,height:11"
                              style={{
                                height: "11cqw",
                                width: "11cqw",
                                display: "block",
                                pointerEvents: "none",
                                userSelect: "none",
                              }}
                              alt="Verification QR Code"
                              draggable={false}
                            />
                          ) : (
                            <div style={{ height: "11cqw", width: "11cqw", backgroundColor: "#f3f4f6" }} />
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* â”€â”€ Action Bar â”€â”€ */}
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
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          <span>Download PDF</span>
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

              {/* Hidden QR Code used to pre-render to image */}
              <div style={{ display: "none" }} aria-hidden="true">
                <QRCode
                  id="certificate-hidden-qr-svg"
                  value={verificationUrl}
                  size={256}
                  level="M"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget,
  );
};

export default CertificatePreviewModal;
