"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { AssessmentResult } from "@/lib/progress";
import Image from "next/image";

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  userName?: string;
}

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
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  if (!isOpen || !exam || !result) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsDownloading(false);
    
    const link = document.createElement('a');
    link.href = '/certificate.jpeg';
    link.download = `OriginBi-${exam.title.replace(/\s+/g, '-')}-Certificate.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      } catch { }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
          />

          {/* Certificate Modal - Centered, Clean, Professional */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 lg:p-8"
          >
            <div 
              className="relative max-w-4xl w-full max-h-[90vh] bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 
                         dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 
                         rounded-2xl shadow-2xl border border-amber-200/50 dark:border-amber-900/30 
                         overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Minimal Header ── */}
              <div className="shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <CertificateIcon className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Certificate</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{exam.title}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* ── Certificate Display Area ── */}
              <div className="flex-1 overflow-auto bg-gradient-to-br from-amber-50/30 via-white to-yellow-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 sm:p-10 flex items-center justify-center">
                <div className="relative w-full max-w-3xl shadow-2xl rounded-lg overflow-hidden bg-white">
                  {/* Certificate Image - Full Size */}
                  <Image
                    src="/certificate.jpeg"
                    alt={`${exam.title} Certificate`}
                    width={1200}
                    height={800}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </div>
              </div>

              {/* ── Action Bar ── */}
              <div className="shrink-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Certificate Info */}
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">ID: </span>
                      <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                        ORG-{exam.id.toUpperCase().slice(0, 4)}-{result.completedAt.slice(0, 10).replace(/-/g, '')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <ShareIcon className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white transition-all flex items-center gap-2"
                    >
                      {isDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4" />
                          <span>Download</span>
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
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium shadow-lg"
                  >
                    Link copied!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CertificatePreviewModal;
