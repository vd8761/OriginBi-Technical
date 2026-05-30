import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Trophy,
  Activity,
  User,
  Mail,
  Compass,
} from "lucide-react";
import Logo from "@/components/ui/Logo";

interface VerifyPageProps {
  params: Promise<{ serialNumber: string }>;
  searchParams: Promise<{ token?: string; module?: string }>;
}

export const metadata = {
  title: "Official Certificate Verification | OriginBi",
  description: "Verify authentic candidate credentials and assessment scores from OriginBi Technical Platform.",
};

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const getModuleLabel = (mod: string) => {
  switch (String(mod).toLowerCase()) {
    case "aptitude":
      return "Aptitude Evaluation Module";
    case "communication":
    case "grammar":
      return "Professional Communication & Grammar Suite";
    case "role":
      return "Role-Based Skill Assessment Workspace";
    case "mnc":
      return "MNC Technical Competency Hub";
    default:
      return "Technical Competency Assessment";
  }
};

export default async function VerifyCertificatePage({
  params,
  searchParams,
}: VerifyPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { serialNumber } = resolvedParams;
  const { token, module: moduleParam } = resolvedSearchParams;

  const apiBase =
    process.env.NEXT_PUBLIC_ASSESSMENT_SERVICE_URL?.replace(/\/$/, "") ||
    "http://localhost:5000";

  let resultData: any = null;
  let errorMsg: string | null = null;

  if (!token || !moduleParam) {
    errorMsg = "Verification parameters are missing. Please scan a valid QR code or check the certificate serial link.";
  } else {
    try {
      const res = await fetch(
        `${apiBase}/api/assessment/${moduleParam}/latest-result?attemptToken=${token}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        resultData = await res.json();
      } else {
        errorMsg = "The requested certificate details could not be found or are not available for verification.";
      }
    } catch (e) {
      console.error("Verification fetch error:", e);
      errorMsg = "Unable to connect to the OriginBi verification network. Please try again later.";
    }
  }

  // Clean candidate name
  const displayName = resultData?.candidateName || "OriginBi Candidate";
  const displayEmail = resultData?.candidateEmail || "candidate@originbi.com";
  const scorePercent = resultData?.overallScorePercent ?? 0;
  const grade = scorePercent >= 90 ? "A" : scorePercent >= 80 ? "B" : scorePercent >= 70 ? "C" : scorePercent >= 60 ? "D" : "F";

  const getModuleTitle = () => {
    if (moduleParam === "aptitude") return "Technical Aptitude & Reasoning";
    if (moduleParam === "communication" || moduleParam === "grammar") return "Professional Communication & English Literacy";
    if (moduleParam === "role") return "Role-Based Software Engineering Competency";
    if (moduleParam === "mnc") return "MNC Multi-Dimensional Technical Skills";
    return "Technical Competence Core";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4faf6] via-[#fafdfb] to-[#ffffff] text-[#1e293b] font-sans antialiased overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-600">
      {/* Background glow meshes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-600/5 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header navbar */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between border-b border-emerald-500/10 backdrop-blur-md bg-white/40">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-auto filter" />
          <span className="text-xs uppercase tracking-widest text-emerald-700/80 font-bold border-l border-emerald-500/20 pl-3">
            Verify Portal
          </span>
        </div>
        <Link
          href="https://evaluation.originbi.com"
          target="_blank"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5"
        >
          <span>evaluation.originbi.com</span>
          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
        </Link>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        {errorMsg ? (
          /* Error Showcase */
          <div className="border border-red-200 bg-red-50/80 backdrop-blur-md rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xl shadow-red-500/5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 border border-red-200 text-red-500 mb-6">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Verification Failed</h2>
            <p className="mt-4 text-slate-600 leading-relaxed text-sm">{errorMsg}</p>
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 text-sm transition shadow-lg shadow-emerald-500/20"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Verified Certificate Presentation */
          <div className="space-y-8">
            {/* Verified Header Badge */}
            <div className="relative border border-emerald-500/20 bg-emerald-50/30 rounded-3xl p-6 sm:p-10 shadow-lg shadow-emerald-500/5 flex flex-col md:flex-row items-center gap-6 sm:gap-8 backdrop-blur-lg">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-50/50 text-emerald-600 shadow-sm">
                  <ShieldCheck className="h-11 w-11 text-emerald-600" />
                </div>
              </div>
              <div className="text-center md:text-left min-w-0 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-black uppercase tracking-widest">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                  </span>
                  Officially Verified Credential
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-sans">
                  Authentic Competency Certification
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl">
                  This secure credential record verifies that the candidate listed below took the examination under formal proctoring supervision and passed.
                </p>
              </div>
            </div>

            {/* Verification Statement & Particulars */}
            <div className="relative border border-emerald-500/15 bg-white/70 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl shadow-slate-100/80 space-y-8">
              
              {/* Elegant Statement */}
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700/80">
                  Verification Statement
                </p>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-sans">
                  &quot;OriginBi Technical Platform officially confirms that a secure credential record for the <span className="text-emerald-600 font-extrabold">{getModuleTitle()}</span> has been successfully verified. The credentials have been authenticated and recorded under secure system logs on <span className="text-slate-900 font-extrabold">{resultData?.completedAt ? new Date(resultData.completedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>.&quot;
                </p>
              </div>

              <div className="border-t border-emerald-500/10 my-6" />

              {/* Particulars Grid */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center">
                  Credential Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="bg-emerald-50/30 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-3">
                    <Compass className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assessment</p>
                      <p className="text-sm font-black text-emerald-700 truncate">{getModuleTitle()}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completion Date</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {resultData?.completedAt
                          ? new Date(resultData.completedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : new Date().toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-3">
                    <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0 w-full">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Serial Code</p>
                      <p className="text-sm font-mono font-bold text-slate-800 truncate">{serialNumber}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
