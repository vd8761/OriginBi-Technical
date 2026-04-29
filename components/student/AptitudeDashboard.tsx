import React from 'react';
import { AptitudeIcon } from '../icons';

interface AptitudeDashboardProps {
    onBack: () => void;
}

const AptitudeDashboard: React.FC<AptitudeDashboardProps> = ({ onBack }) => {
    // Mock data based on Aptitude Assessment topics
    const performanceData = [
        { topic: "Quantitative", score: 85, total: 100, color: "bg-brand-green" },
        { topic: "Logical Reasoning", score: 72, total: 100, color: "bg-blue-500" },
        { topic: "Data Interpretation", score: 90, total: 100, color: "bg-purple-500" },
        { topic: "Abstract Reasoning", score: 65, total: 100, color: "bg-amber-500" },
    ];

    const insights = [
        { type: "strength", text: "Excellent work on Data Interpretation! You're highly naturally gifted at processing complex visual data sets rapidly." },
        { type: "improvement", text: "You are currently weak in Abstract Reasoning. We recommend you concentrate on pattern recognition and mental rotation drills to bridge this gap." },
        { type: "time", text: "You've maintained a great pace! You're 15% faster than the industry benchmark, giving you more time for complex logic." }
    ];

    return (
        <div className="animate-fade-in flex flex-col gap-6">
            {/* Hero Stats Card */}
            <div className="relative overflow-hidden bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-3xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/5 blur-3xl rounded-full -mr-48 -mt-48"></div>
                
                <div className="relative z-10 p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-center">
                    {/* Overall Score Circle */}
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-gray-100 dark:text-white/5"
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="10"
                                strokeDasharray={440}
                                strokeDashoffset={440 - (440 * 78) / 100}
                                strokeLinecap="round"
                                className="text-brand-green transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-black dark:text-white">78%</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">Overall Score</span>
                        </div>
                    </div>

                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center lg:justify-start">
                            <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green border border-brand-green/30">
                                <AptitudeIcon />
                            </div>
                            <h2 className="text-2xl font-black text-black dark:text-white">Aptitude Performance</h2>
                        </div>
                        <p className="text-sm text-black dark:text-white/80 max-w-xl mb-6 font-medium leading-relaxed">
                            You have a strong ability to solve complex problems and work with numbers accurately. Your results show that you are a great fit for roles that require careful thinking and data analysis.
                        </p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/10">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5">Conceptual Grip</p>
                                <p className="text-xl font-black text-black dark:text-white">Advanced</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/10">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5">Thinking Speed</p>
                                <p className="text-xl font-black text-black dark:text-white">42s / qn</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/10">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5">Logic Accuracy</p>
                                <p className="text-xl font-black text-brand-green">88.4%</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/10">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5">Total Questions</p>
                                <p className="text-xl font-black text-black dark:text-white">60 / 60</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sectional Breakdown */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6">
                    <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-6">Sectional Analysis</h3>
                    <div className="flex flex-col gap-6">
                        {performanceData.map((item, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider">{item.topic}</span>
                                    <span className="text-[11px] font-black text-black dark:text-white">{item.score}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                                        style={{ width: `${item.score}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mind Analysis Card */}
                <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col">
                    <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-6">Mind Analysis</h3>
                    <div className="flex flex-col gap-4 flex-1">
                        {insights.map((insight, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border ${
                                insight.type === 'strength' ? 'bg-brand-green/5 border-brand-green/20' : 
                                insight.type === 'improvement' ? 'bg-amber-500/5 border-amber-500/20' : 
                                'bg-blue-500/5 border-blue-500/20'
                            }`}>
                                <p className="text-[12px] font-medium text-black dark:text-white leading-relaxed">
                                    {insight.text}
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    <button className="w-full mt-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-[11px] rounded-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                        View Detailed roadmap
                    </button>
                </div>
            </div>

            {/* Bottom Comparison Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6">
                    <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-4">Competency Radar</h3>
                    <div className="aspect-square w-full max-w-[320px] mx-auto relative flex items-center justify-center p-4">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                            {/* Radar Background Circles */}
                            {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
                                <circle
                                    key={level}
                                    cx="50"
                                    cy="50"
                                    r={40 * level}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="0.1"
                                    className="text-gray-200 dark:text-white/10"
                                />
                            ))}
                            
                            {/* Axis Lines */}
                            {performanceData.map((_, i) => {
                                const angle = (i * 2 * Math.PI) / performanceData.length - Math.PI / 2;
                                return (
                                    <line
                                        key={i}
                                        x1="50"
                                        y1="50"
                                        x2={50 + 40 * Math.cos(angle)}
                                        y2={50 + 40 * Math.sin(angle)}
                                        stroke="currentColor"
                                        strokeWidth="0.1"
                                        className="text-gray-200 dark:text-white/10"
                                    />
                                );
                            })}

                            {/* Data Polygon */}
                            <polygon
                                points={performanceData.map((d, i) => {
                                    const angle = (i * 2 * Math.PI) / performanceData.length - Math.PI / 2;
                                    const r = (40 * d.score) / 100;
                                    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                                }).join(' ')}
                                fill="currentColor"
                                fillOpacity="0.15"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-brand-green"
                            />

                            {/* Data Points */}
                            {performanceData.map((d, i) => {
                                const angle = (i * 2 * Math.PI) / performanceData.length - Math.PI / 2;
                                const r = (40 * d.score) / 100;
                                return (
                                    <circle
                                        key={i}
                                        cx={50 + r * Math.cos(angle)}
                                        cy={50 + r * Math.sin(angle)}
                                        r="1.5"
                                        fill="currentColor"
                                        className="text-brand-green shadow-sm"
                                    />
                                );
                            })}

                            {/* Labels */}
                            {performanceData.map((d, i) => {
                                const angle = (i * 2 * Math.PI) / performanceData.length - Math.PI / 2;
                                const r = 48;
                                const x = 50 + r * Math.cos(angle);
                                const y = 50 + r * Math.sin(angle);
                                return (
                                    <text
                                        key={i}
                                        x={x}
                                        y={y}
                                        fontSize="3"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="currentColor"
                                        className="text-[3px] font-bold uppercase tracking-tighter text-black/40 dark:text-white/40"
                                    >
                                        {d.topic.substring(0, 4)}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>
                
                <div className="bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl border border-white/20 dark:border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-4">Recommended Next Steps</h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 flex items-center justify-between group cursor-pointer hover:border-brand-green transition-all">
                                <div className="flex-1">
                                    <p className="text-[11px] font-bold text-black dark:text-white leading-none mb-1">Communication Assessment</p>
                                    <p className="text-[10px] text-black/50 dark:text-white/50">Take this to check your verbal and soft skills</p>
                                </div>
                                <div className="px-3 py-1 bg-brand-green/10 text-brand-green text-[9px] font-bold rounded-lg uppercase">Suggested</div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 flex items-center justify-between group cursor-pointer hover:border-brand-green transition-all">
                                <div className="flex-1">
                                    <p className="text-[11px] font-bold text-black dark:text-white leading-none mb-1">Role Based Questions</p>
                                    <p className="text-[10px] text-black/50 dark:text-white/50">Validate your core technical expertise</p>
                                </div>
                                <div className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-black/40 dark:text-white/40 text-[9px] font-bold rounded-lg uppercase">Unlock</div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};

export default AptitudeDashboard;
