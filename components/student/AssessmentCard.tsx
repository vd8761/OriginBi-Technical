interface AssessmentCardProps {
    title: string;
    description: string;
    progress: number;
    totalQuestions: number;
    completedQuestions: number;
    status: 'not-started' | 'in-progress' | 'completed';
    icon: React.ReactNode;
    price?: string;
    tags?: string[];
    duration?: string;
    onDetailsClick?: () => void;
    onClick?: () => void;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
    title,
    description,
    totalQuestions,
    completedQuestions,
    duration = "45 Mins",
    icon,
    price = "₹0.00",
    tags = [],
    onDetailsClick,
    onClick
}) => {
    return (
        <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col transition-all duration-500 group h-full hover:scale-[1.01] hover:border-brand-green/40">
            <div className="flex gap-4 mb-4">
                {/* Left: Hero Icon */}
                <div className="flex items-center justify-center shrink-0 w-12 h-12 bg-brand-green/10 rounded-2xl text-brand-green transition-transform duration-500 group-hover:scale-110 border border-brand-green/20">
                    {icon}
                </div>

                <div className="flex-1 min-w-0 flex items-center">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white transition-colors">{title}</h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <p className="text-[13px] text-slate-600 dark:text-gray-300 line-clamp-2 leading-relaxed mb-4 font-normal">{description}</p>

                {/* Stats Row */}
                <div className="flex items-center gap-6 mb-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">Questions</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{totalQuestions} Qs</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">Duration</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{duration}</span>
                    </div>
                </div>

                {/* Badges/Tags - Now at the bottom after para */}
                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[9px] font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Thin Line Separator */}
            <div className="h-[1px] w-full bg-black/10 dark:bg-white/10 mb-5"></div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none">Price</span>
                    <span className="text-[15px] font-bold text-brand-green mt-1">{price}</span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onDetailsClick}
                        className="px-5 py-2 text-[11px] font-medium text-black dark:text-white border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all cursor-pointer"
                    >
                        Details
                    </button>
                    <button 
                        onClick={onClick} 
                        className={`px-6 py-2 text-[11px] font-bold rounded-full transition-all active:scale-95 cursor-pointer shadow-sm hover:shadow-md ${
                            status === 'completed' 
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90' 
                                : 'bg-brand-green text-white hover:bg-[#1bb85c]'
                        }`}
                    >
                        {status === 'completed' ? 'View Results' : status === 'in-progress' ? 'Resume' : 'Start Test'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssessmentCard;
