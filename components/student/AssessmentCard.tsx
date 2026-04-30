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
        <article className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#111a15] dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
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

                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${statusTone}`}>
                        {statusLabel}
                    </span>
                </div>

                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                </p>

                <div className="my-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 dark:border-white/10">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Questions</p>
                        <p className="mt-1 text-sm font-extrabold text-[#17201b] dark:text-white">{totalQuestions}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Duration</p>
                        <p className="mt-1 text-sm font-extrabold text-[#17201b] dark:text-white">{duration}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Access</p>
                        <p className="mt-1 text-sm font-extrabold text-[#17201b] dark:text-white">{price}</p>
                    </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Report focus</p>
                    <p className="mt-1 text-sm font-bold leading-5 text-[#17201b] dark:text-white">{insight}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row dark:border-white/10">
                <button
                    type="button"
                    onClick={onDetailsClick}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-[#17201b] transition hover:border-brand-green hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:text-white dark:hover:border-brand-green dark:focus-visible:ring-offset-[#111a15]"
                >
                    Details
                </button>
                <button
                    type="button"
                    onClick={onStartClick}
                    disabled={!available}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-green px-4 text-sm font-extrabold text-[#0f1712] transition hover:bg-[#19be5e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:focus-visible:ring-offset-[#111a15] dark:disabled:bg-white/10 dark:disabled:text-slate-400"
                    aria-label={available ? `Start ${title}` : `${title} is launching soon`}
                >
                    {available ? "Start" : "Soon"}
                </button>
            </div>
        </article>
    );
};

export default AssessmentCard;
