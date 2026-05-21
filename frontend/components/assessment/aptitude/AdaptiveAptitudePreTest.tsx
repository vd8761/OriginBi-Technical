import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AdaptiveAptitudePreTestProps {
  mode: 'trial' | 'main';
  onStart: (mode: 'trial' | 'main') => void;
  onClose: () => void;
  accentColor?: string;
  gradient?: string;
}

const AdaptiveAptitudePreTest: React.FC<AdaptiveAptitudePreTestProps> = ({
  mode,
  onStart,
  onClose,
  accentColor = '#1ED36A',
  gradient = 'linear-gradient(135deg, #1ED36A 0%, #1bb85c 100%)',
}) => {
  const router = useRouter();
  const [isAdaptive, setIsAdaptive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [blockConfig, setBlockConfig] = useState<{ blocksPerAssessment: number; questionsPerBlock: number } | null>(null);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [isV2, setIsV2] = useState(false);

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
        const response = await fetch(`${API_BASE}/api/assessment/admin/assessments?moduleType=aptitude`);

        if (response.ok) {
          const data = await response.json();
          const aptitudeAssessment = data.data?.[0];

          const isV2Adaptive = aptitudeAssessment?.adaptive_enabled === true;
          const isV1Adaptive = aptitudeAssessment?.block_config?.enabled === true;
          if (isV2Adaptive || isV1Adaptive) {
            setIsAdaptive(true);
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
          } else {
            setIsAdaptive(false);
          }
        } else {
          setIsAdaptive(false);
        }
      } catch {
        setIsAdaptive(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdaptiveMode();
  }, []);

  const handleStart = async () => {
    if (isAdaptive && isV2 && assessmentId) {
      // Start a v2 adaptive attempt, then redirect with the token
      setIsStarting(true);
      setStartError(null);
      try {
        const API_BASE =
          (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
            ? ""
            : process.env.NEXT_PUBLIC_TECH_API_URL?.replace(/\/$/, "")) ||
          process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
          "";

        // Resolve userId from localStorage
        let userId: number | null = null;
        try {
          const profileRaw = localStorage.getItem("originbi:user-profile");
          if (profileRaw) { const p = JSON.parse(profileRaw); if (p?.id) userId = Number(p.id); }
        } catch {}
        if (!userId) {
          try {
            const stored = localStorage.getItem("userId") || localStorage.getItem("user");
            if (stored) {
              const parsed = JSON.parse(stored);
              const id = typeof parsed === "object" ? parsed?.id : parseInt(stored);
              if (id) userId = Number(id);
            }
          } catch {}
        }

        const res = await fetch(`${API_BASE}/api/assessment/aptitude/attempts/block-based`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentCode: "TECH_APT_001", userId: userId ?? 1, mode }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "Unknown error");
          throw new Error(`Failed to start attempt: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        const token = data.attemptToken;
        onClose();
        router.push(`/assessment/aptitude/adaptive?v2=true&mode=${mode}&assessmentId=${assessmentId}&attemptToken=${token}`);
      } catch (err) {
        setStartError((err as Error).message);
        setIsStarting(false);
      }
    } else if (isAdaptive) {
      // v1 legacy path
      onClose();
      router.push(`/assessment/aptitude/adaptive?mode=${mode}`);
    } else {
      onClose();
      onStart(mode);
    }
  };

  const blocks = blockConfig?.blocksPerAssessment ?? 5;
  const qPerBlock = blockConfig?.questionsPerBlock ?? 9;

  const features = [
    {
      icon: (
        // Target / block-based icon
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      title: 'Block-Based Structure',
      desc: `${blocks} blocks with ${qPerBlock} questions each. Progress through adaptive difficulty levels.`,
    },
    {
      icon: (
        // Clock icon
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      title: 'Time Management',
      desc: `${blocks} blocks with individual time limits for focused performance.`,
    },
    {
      icon: (
        // Navigation / info icon
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      title: 'Smart Navigation',
      desc: 'Navigate freely within blocks. Previous blocks become read-only as you progress.',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden="true" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="adaptive-aptitude-pretest-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111a15]"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: gradient || accentColor }}
            >
              {/* Book / aptitude icon */}
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2
                id="adaptive-aptitude-pretest-title"
                className="text-xl font-bold text-slate-900 dark:text-white"
              >
                Aptitude Assessment
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {mode === 'trial' ? 'Practice Mode' : 'Certified Assessment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-brand-green hover:text-brand-green dark:border-white/10 dark:text-slate-400 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto px-6 pb-2 sm:px-7">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <svg className="h-6 w-6 animate-spin text-brand-green" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
                Checking assessment configuration...
              </span>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Adaptive badge */}
              {isAdaptive && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                      Adaptive Assessment
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Questions will adapt to your performance level. The difficulty adjusts based on your answers to provide a personalized experience.
                  </p>
                </div>
              )}

              {/* Features list */}
              <div className="space-y-4 mb-5">
                {features.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${f.iconBg}`}>
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mode info box */}
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                <div className="flex items-center gap-2 mb-1.5">
                  {mode === 'trial' ? (
                    <>
                      <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Practice Mode</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Certified Assessment</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {mode === 'trial'
                    ? 'Perfect for practice. Get familiar with the format without any pressure.'
                    : 'Official assessment attempt. Your performance will be recorded and certified.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-end sm:px-7 dark:border-white/10 dark:bg-transparent">
          {startError && (
            <p className="flex-1 text-xs text-red-500 dark:text-red-400">{startError}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading || isStarting}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: gradient || accentColor }}
          >
            {isStarting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                Start Assessment
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </footer>

        {/* Terms */}
        <p className="pb-4 text-center text-xs text-slate-400 dark:text-slate-500">
          By starting, you agree to our terms and assessment guidelines.
        </p>
      </section>
    </div>
  );
};

export default AdaptiveAptitudePreTest;
