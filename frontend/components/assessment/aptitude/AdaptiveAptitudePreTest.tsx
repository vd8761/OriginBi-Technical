import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { securityCheckBeforeStart, getUserId } from "@/lib/assessmentSecurity";

interface AdaptiveAptitudePreTestProps {
  mode: 'trial' | 'main';
  onStart: (mode: 'trial' | 'main') => void;
  onClose: () => void;
  accentColor?: string;
  gradient?: string;
}

const checklist = [
  "Questions adapt in real-time based on your performance.",
  "Each block has its own time limit — manage your pace.",
  "Navigate freely within a block; previous blocks become read-only.",
  "Do not refresh or navigate away during the assessment.",
];

const modules = [
  { title: "Quantitative", desc: "Numbers & problem solving" },
  { title: "Logical", desc: "Patterns & reasoning" },
  { title: "Verbal", desc: "Language & comprehension" },
];

const AdaptiveAptitudePreTest: React.FC<AdaptiveAptitudePreTestProps> = ({
  mode,
  onStart,
  onClose,
  accentColor = '#1ED36A',
  gradient = 'linear-gradient(135deg, #1ED36A 0%, #1bb85c 100%)',
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [blockConfig, setBlockConfig] = useState<{ blocksPerAssessment: number; questionsPerBlock: number } | null>(null);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [isV2, setIsV2] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [trialAttemptsLimit, setTrialAttemptsLimit] = useState<number>(5);
  const [mainAttemptsLimit, setMainAttemptsLimit] = useState<number>(2);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const checkAdaptiveMode = async () => {
      try {
        const API_BASE =
          (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
            ? ""
            : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
          process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
          "";

        const [assessmentsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/assessment/admin/assessments?module=aptitude`),
          (async () => {
            try {
              let activeEmail = "";
              const storedProfile = localStorage.getItem("originbi:user-profile");
              if (storedProfile) {
                const parsed = JSON.parse(storedProfile);
                if (parsed?.email) activeEmail = parsed.email;
              }
              if (!activeEmail) {
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                  const parsed = JSON.parse(storedUser);
                  if (parsed?.email) activeEmail = parsed.email;
                }
              }
              const emailParam = activeEmail ? `?userId=${encodeURIComponent(activeEmail)}` : "";
              return fetch(`${API_BASE}/api/assessment/attempts-stats${emailParam}`);
            } catch {
              return null;
            }
          })(),
        ]);

        if (assessmentsRes.ok) {
          const data = await assessmentsRes.json();
          const aptitudeAssessment = data.data?.find(
            (a: any) => a.module_type === "aptitude" || a.assessment_code === "TECH_APT_001"
          ) || data.data?.[0];

          const isV2Adaptive = aptitudeAssessment?.adaptive_enabled === true;
          const isV1Adaptive = aptitudeAssessment?.block_config?.enabled === true;
          if (isV2Adaptive || isV1Adaptive) {
            setIsV2(isV2Adaptive);
            setAssessmentId(aptitudeAssessment.assessment_id ?? null);
            setBlockConfig(
              aptitudeAssessment.block_config ?? {
                blocksPerAssessment: aptitudeAssessment.adaptive_total_blocks ?? 5,
                questionsPerBlock: Math.ceil(
                  (aptitudeAssessment.adaptive_total_marks ?? 45) /
                    (aptitudeAssessment.adaptive_total_blocks ?? 5)
                ),
              }
            );
          }

          const tLim = aptitudeAssessment?.trial_attempts_limit;
          const mLim = aptitudeAssessment?.main_attempts_limit;
          if (tLim != null) setTrialAttemptsLimit(Number(tLim));
          if (mLim != null) setMainAttemptsLimit(Number(mLim));
        }

        if (statsRes) {
          try {
            const statsJson = await (statsRes as Response).json();
            const statsData = statsJson.data || statsJson;
            if (statsData) {
              const stats = statsData['aptitude'] || { trial: 0, main: 0 };
              setAttemptsCount(mode === 'trial' ? stats.trial : stats.main);
            }
          } catch {}
        }
      } catch {
        // non-fatal
      } finally {
        setIsLoading(false);
      }
    };

    checkAdaptiveMode();
  }, [mode]);

  const handleStart = async () => {
    if (isV2 && assessmentId) {
      setIsStarting(true);
      setStartError(null);
      try {
        const API_BASE =
          (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
            ? ""
            : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
          process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
          "";

        // SECURITY: Comprehensive security check before starting
        const securityCheck = await securityCheckBeforeStart('aptitude', mode, API_BASE);
        
        if (!securityCheck.canProceed) {
          throw new Error(securityCheck.error || 'Security validation failed');
        }
        
        const sanitizedMode = securityCheck.sanitizedMode;
        const userId = getUserId();

        const res = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/block-based`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentCode: "TECH_APT_001", userId: userId, mode: sanitizedMode }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "Unknown error");
          throw new Error(`Failed to start attempt: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        const token = data.attemptToken;
        onClose();
        router.push(`/assessment/aptitude/adaptive?v2=true&mode=${sanitizedMode}&assessmentId=${assessmentId}&attemptToken=${token}`);
      } catch (err) {
        setStartError((err as Error).message);
        setIsStarting(false);
      }
    } else {
      onClose();
      onStart(mode);
    }
  };

  const blocks = blockConfig?.blocksPerAssessment ?? 5;
  const qPerBlock = blockConfig?.questionsPerBlock ?? 9;
  const limit = mode === 'trial' ? trialAttemptsLimit : mainAttemptsLimit;
  const currentAttempt = attemptsCount + 1;

  const metrics = [
    { label: "Blocks", value: `${blocks}` },
    { label: "Questions/Block", value: `${qPerBlock}` },
    { label: "Format", value: "Adaptive MCQ" },
    { label: "Attempts", value: `${currentAttempt}/${limit}` },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="adaptive-aptitude-pretest-title"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111a15]"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-8 dark:border-white/10">
          <div className="flex items-start gap-6">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: gradient || accentColor }}
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="adaptive-aptitude-pretest-title"
                  className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
                >
                  Aptitude Assessment
                </h2>
                {mode === 'trial' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 whitespace-nowrap">
                    Trial Assessment
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-900 dark:text-white">
                Adaptive evaluation of quantitative reasoning, logical thinking, and verbal ability.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-brand-green hover:text-brand-green dark:border-white/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="overflow-y-auto p-6 sm:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-brand-green" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
                Checking assessment configuration...
              </span>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
              {/* Left column */}
              <div className="space-y-8 order-2 lg:order-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Core domains</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {modules.map((m) => (
                      <div
                        key={m.title}
                        className="rounded-xl border p-4 dark:border-white/10 dark:bg-white/5"
                        style={{
                          borderColor: `${accentColor}1a`,
                          backgroundColor: `${accentColor}0d`,
                        }}
                      >
                        <p
                          className="text-sm font-black uppercase tracking-wider mb-1"
                          style={{ color: accentColor }}
                        >
                          {m.title}
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Test Protocol</h3>
                  <div className="space-y-3">
                    {checklist.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <div
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <aside
                className="h-fit rounded-2xl p-6 dark:border-white/10 dark:bg-white/5 order-1 lg:order-2"
                style={{
                  border: `1px solid ${accentColor}1a`,
                  backgroundColor: `${accentColor}08`,
                }}
              >
                <h3
                  className="text-sm font-bold uppercase tracking-wider mb-4"
                  style={{ color: accentColor }}
                >
                  Session Stats
                </h3>
                <div className="space-y-4">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0 dark:border-white/10"
                      style={{ borderColor: `${accentColor}1a` }}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{metric.label}</span>
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">{metric.value}</strong>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-end sm:px-8 dark:border-white/10 dark:bg-transparent">
          {startError && (
            <p className="flex-1 text-xs text-red-500 dark:text-red-400">{startError}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="px-8 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-900 hover:opacity-80 dark:text-white dark:hover:opacity-80 transition-all disabled:opacity-50"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading || isStarting}
            className="rounded-lg px-10 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: gradient || accentColor }}
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </span>
            ) : (
              "Begin test"
            )}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default AdaptiveAptitudePreTest;
