import { ArrowRightIcon } from "../icons";

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
    accentColor?: string;
    gradient?: string;
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
    accentColor = '#1ED36A',
    gradient,
    onDetailsClick,
    onStartClick,
}) => {
    return (
        <div 
            className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl p-6 flex flex-col transition-all duration-500 group h-full hover:scale-[1.01] hover:border-[var(--acc-color)]"
            style={{ '--acc-color': `${accentColor}66` } as React.CSSProperties}
        >
            <div className="flex gap-4 mb-4">
                {/* Left: Hero Icon */}
                <div 
                    className="flex items-center justify-center shrink-0 w-14 h-14 rounded-2xl text-white shadow-lg [&_svg]:h-7 [&_svg]:w-7"
                    style={{ background: gradient || accentColor }}
                >
                    {icon}
                </div>

                <div className="flex-1 min-w-0 flex items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white transition-colors tracking-tight">{title}</h3>
                </div>

                {/* Top Right: Details Arrow */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDetailsClick();
                    }}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group/arrow self-start -mt-2 -mr-2"
                    title="View Details"
                >
                    <ArrowRightIcon className="w-5 h-5 text-slate-600 group-hover/arrow:text-slate-900 dark:text-slate-300 dark:group-hover/arrow:text-white transition-colors" />
                </button>
            </div>

            <div className="flex-1 flex flex-col">
                <p className="text-[13px] text-slate-800 dark:text-slate-100 line-clamp-2 leading-relaxed mb-4 font-normal">{description}</p>

                {/* Stats Row */}
                <div className="flex items-center gap-5 mb-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">Questions</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{totalQuestions} Qs</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">Duration</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{duration}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">Attempts</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">2 Main / 5 Trial</span>
                    </div>
                </div>

                {/* Badges/Tags - Now at the bottom after para */}
                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[9px] font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Thin Line Separator */}
            <div className="h-[1px] w-full bg-black/10 dark:bg-white/10 mb-5"></div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end">
                <div className="flex gap-2">
                    <button
                        onClick={onDetailsClick}
                        className="px-5 py-2 text-xs font-medium text-black dark:text-white border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all cursor-pointer"
                    >
                        Start Trial
                    </button>
                    <button 
                        onClick={onStartClick}
                        className={`px-6 py-2 text-xs font-bold rounded-full transition-all active:scale-95 cursor-pointer shadow-sm hover:shadow-md ${
                            available 
                                ? 'bg-brand-green text-white hover:bg-[#1bb85c] shadow-brand-green/20' 
                                : 'bg-slate-400 text-white cursor-not-allowed'
                        }`}
                        disabled={!available}
                    >
                        {available ? 'Start Test' : 'Coming Soon'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssessmentCard;
