interface AssessmentCardProps {
    title: string;
    description: string;
    statusLabel: string;
    statusTone: string;
    totalQuestions: number;
    duration: string;
    price: string;
    tags: string[];
    icon: React.ReactNode;
    available: boolean;
    level: string;
    insight: string;
    onDetailsClick: () => void;
    onStartClick: () => void;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
    title,
    description,
    statusLabel,
    statusTone,
    totalQuestions,
    duration,
    price,
    tags,
    icon,
    available,
    level,
    insight,
    onDetailsClick,
    onStartClick,
}) => {
    return (
        <article className="group relative flex h-full flex-col rounded-[1.5rem] bg-white/90 dark:bg-[#161f1a]/90 backdrop-blur-xl shadow-[0_16px_48px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(30,211,106,0.1)] dark:hover:shadow-[0_30px_60px_rgba(30,211,106,0.15)] overflow-hidden border border-slate-200/60 dark:border-white/10 z-10 before:absolute before:inset-0 before:z-[-1] before:bg-gradient-to-b before:from-brand-green/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
            <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-green/20 bg-brand-green/10 text-brand-green">
                            {icon}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-extrabold leading-snug text-[#17201b] dark:text-white">
                                {title}
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                                {level}
                            </p>
                        </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-wide shadow-sm ${statusTone}`}>
                        {statusLabel}
                    </span>
                </div>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {description}
                </p>

                <div className="my-6 grid grid-cols-3 gap-3 border-y border-slate-100/80 py-4 dark:border-white/5 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 via-transparent to-brand-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                    <div className="relative z-10 group/stat">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover/stat:text-brand-green transition-colors">Questions</p>
                        <p className="mt-1.5 text-sm font-extrabold text-[#17201b] dark:text-white transform group-hover/stat:scale-105 transition-transform origin-left">{totalQuestions}</p>
                    </div>
                    <div className="relative z-10 group/stat">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover/stat:text-cyan-500 transition-colors">Duration</p>
                        <p className="mt-1.5 text-sm font-extrabold text-[#17201b] dark:text-white transform group-hover/stat:scale-105 transition-transform origin-left">{duration}</p>
                    </div>
                    <div className="relative z-10 group/stat">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover/stat:text-purple-500 transition-colors">Access</p>
                        <p className="mt-1.5 text-sm font-extrabold text-[#17201b] dark:text-white transform group-hover/stat:scale-105 transition-transform origin-left">{price}</p>
                    </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                        <span
                            key={tag}
                            className="rounded-lg border border-slate-200/50 bg-slate-50/80 px-3 py-1.5 text-[11px] font-bold tracking-wide text-slate-600 dark:border-white/5 dark:bg-white/5 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-auto rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02] group-hover:bg-slate-100/50 dark:group-hover:bg-white/[0.04] transition-colors duration-300">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Report focus</p>
                    <p className="mt-1.5 text-sm font-bold leading-relaxed text-[#17201b] dark:text-white">{insight}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100/80 p-5 sm:flex-row dark:border-white/5 relative bg-slate-50/30 dark:bg-black/10">
                <button
                    type="button"
                    onClick={onDetailsClick}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:border-white/20 active:scale-95"
                >
                    View Details
                </button>
                <button
                    type="button"
                    onClick={onStartClick}
                    disabled={!available}
                    className="relative overflow-hidden inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-bold text-[#0f1712] transition-all duration-300 hover:bg-[#19be5e] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-white/5 dark:disabled:text-slate-500 active:scale-95 group/btn"
                    aria-label={available ? `Start ${title}` : `${title} is launching soon`}
                >
                    {available && (
                        <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        {available ? "Start Exam" : "Coming Soon"}
                        {available && (
                            <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        )}
                    </span>
                </button>
            </div>
        </article>
    );
};

export default AssessmentCard;
