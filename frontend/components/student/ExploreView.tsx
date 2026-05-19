import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightIcon, LockIcon } from '../icons';
import type { Exam } from './ExamCarousel';
import { usePaidAssessments, codingPaymentKey, type PaymentKey } from '@/lib/payments';
import { CODING_LANGUAGES } from '@/lib/exams';
import { listAssignments, type Assignment } from '@/lib/api';

type Track = 'core' | 'technical' | 'career';
type ExploreFilter = 'all' | Track;

interface ExploreExam extends Exam {
    track?: Track;
}

interface ExamDetail {
    focus: string;
    outcomes: string[];
    skills: { title: string; description: string }[];
    sections: { name: string; detail: string; weight: string }[];
    requirements: string[];
}

interface ExploreViewProps {
    assessments: ExploreExam[];
    examDetails: Record<string, ExamDetail>;
    onNavigateToDetails: (assessment: ExploreExam) => void;
}

const TRACK_META: Record<Track, { label: string; description: string; accent: string }> = {
    core: {
        label: 'Core Skills',
        description: 'Foundational benchmarks every candidate should take first.',
        accent: '#10b981',
    },
    technical: {
        label: 'Tech Hiring',
        description: 'Coding, DSA, and interview-style problem solving.',
        accent: '#f59e0b',
    },
    career: {
        label: 'Career Fit',
        description: 'Role-fit diagnostics and workplace decision-making.',
        accent: '#06b6d4',
    },
};

const FILTER_PILLS: { value: ExploreFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'core', label: 'Core' },
    { value: 'technical', label: 'Technical' },
    { value: 'career', label: 'Career' },
];

const TRACK_ORDER: Track[] = ['core', 'technical', 'career'];

const ExploreView: React.FC<ExploreViewProps> = ({ assessments, examDetails, onNavigateToDetails }) => {
    const [filter, setFilter] = useState<ExploreFilter>('all');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const { isPaid } = usePaidAssessments();

    const refreshAssignments = useCallback(async () => {
        try {
            const data = await listAssignments();
            setAssignments(data.assignments);
        } catch {
            setAssignments([]);
        }
    }, []);

    useEffect(() => {
        const id = window.setTimeout(() => {
            void refreshAssignments();
        }, 0);
        return () => window.clearTimeout(id);
    }, [refreshAssignments]);

    const grouped = useMemo(() => {
        const map: Record<Track, ExploreExam[]> = { core: [], technical: [], career: [] };
        assessments.forEach((exam) => {
            const track = (exam.track ?? 'core') as Track;
            map[track].push(exam);
        });
        return map;
    }, [assessments]);

    const visibleTracks: Track[] = filter === 'all' ? TRACK_ORDER : [filter];

    return (
        <div className="animate-fade-in flex flex-col gap-12 w-full pb-16">
            {/* Hero & Filter */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                <header className="flex flex-col gap-3 max-w-3xl">
                    <h1 className="text-[clamp(28px,3.4vw,44px)] font-bold text-black dark:text-white tracking-tight leading-[1.05]">
                        Find the Assessment That Fits You
                    </h1>
                </header>

                <div className="flex flex-wrap items-center gap-2 md:mt-2 shrink-0">
                    {FILTER_PILLS.map((pill) => {
                        const active = filter === pill.value;
                        return (
                            <button
                                key={pill.value}
                                onClick={() => setFilter(pill.value)}
                                className={`rounded-full px-5 py-2 text-[12px] font-semibold tracking-wide transition-all ${active
                                        ? 'bg-[#1ED36A] text-white shadow-sm shadow-[#1ED36A]/30'
                                        : 'bg-white/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 text-black dark:text-white hover:border-[#1ED36A]/40 hover:text-black dark:hover:text-white'
                                    }`}
                            >
                                {pill.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Track sections */}
            <div className="flex flex-col gap-14">
                {visibleTracks.map((track) => {
                    const exams = grouped[track];
                    if (!exams || exams.length === 0) return null;
                    const meta = TRACK_META[track];
                    return (
                        <section key={track} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ background: meta.accent }}
                                    />
                                    <h2 className="text-[18px] font-bold text-black dark:text-white tracking-tight">
                                        {meta.label}
                                    </h2>
                                    <span className="text-[12px] font-medium text-black dark:text-white">
                                        {exams.length} {exams.length === 1 ? 'assessment' : 'assessments'}
                                    </span>
                                </div>
                                <p className="text-[13px] text-black dark:text-white leading-relaxed">
                                    {meta.description}
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {exams.map((exam) => {
                                    const paidStatus = computePaidStatus(exam.id, isPaid, assignments);
                                    return (
                                        <ExploreAssessmentCard
                                            key={exam.id}
                                            exam={exam}
                                            outcomes={examDetails[exam.id]?.outcomes ?? []}
                                            focus={examDetails[exam.id]?.focus}
                                            paidStatus={paidStatus}
                                            onKnowMore={() => onNavigateToDetails(exam)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Why these assessments */}
            <section className="mt-4 rounded-3xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl p-8 lg:p-10">
                <div className="flex flex-col gap-2 mb-8 max-w-xl">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                        Why These Assessments
                    </span>
                    <h3 className="text-[22px] font-bold text-black dark:text-white leading-tight">
                        Built for hiring you actually face.
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <WhyItem
                        title="Industry Standard"
                        description="Question patterns are modeled after current MNC and product-company recruitment screens, so what you practice matches what you sit for."
                    />
                    <WhyItem
                        title="Skill Gap Analysis"
                        description="Every report breaks down strengths and gaps by topic and difficulty, so you know exactly where to put your next hour of effort."
                    />
                    <WhyItem
                        title="Verified Reports"
                        description="Share a verified score with employers and counsellors. The same report fuels your Origin BI roadmap and role recommendations."
                    />
                </div>
            </section>
        </div>
    );
};

type PaidStatus = { kind: 'none' } | { kind: 'paid' } | { kind: 'partial'; count: number; total: number };

const computePaidStatus = (
    examId: string,
    isPaid: (key: PaymentKey) => boolean,
    assignments: Assignment[],
): PaidStatus => {
    if (examId === 'coding') {
        const total = CODING_LANGUAGES.length;
        const count = CODING_LANGUAGES.filter((lang) => {
            const key = codingPaymentKey(lang.id);
            if (isPaid(key)) return true;
            return assignments.some((assignment) => (
                assignment.assignmentRef === key &&
                (assignment.status === 'active' || assignment.status === 'completed' || assignment.completed)
            ));
        }).length;
        if (count === 0) return { kind: 'none' };
        return { kind: 'partial', count, total };
    }
    return isPaid(examId as PaymentKey) ? { kind: 'paid' } : { kind: 'none' };
};

interface ExploreAssessmentCardProps {
    exam: ExploreExam;
    outcomes: string[];
    focus?: string;
    paidStatus: PaidStatus;
    onKnowMore: () => void;
}

const ExploreAssessmentCard: React.FC<ExploreAssessmentCardProps> = ({ exam, outcomes, focus, paidStatus, onKnowMore }) => {
    const isReady = exam.available;
    const accent = exam.accentColor || '#1ED36A';
    const gradient = exam.gradient || `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`;
    const helpfulFor = outcomes.slice(0, 3);

    return (
        <article
            className={`group relative flex flex-col rounded-3xl border bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl border-slate-200/70 dark:border-white/[0.08] p-6 transition-all duration-300 ${isReady
                    ? 'hover:-translate-y-0.5 hover:border-[#1ED36A]/40 hover:shadow-[0_20px_40px_rgba(30,211,106,0.08)]'
                    : 'opacity-70'
                }`}
        >
            {/* Top: icon + status */}
            <div className="flex items-start justify-between mb-5">
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md [&_svg]:h-7 [&_svg]:w-7"
                    style={{ background: gradient }}
                >
                    {exam.icon}
                </div>
                {isReady ? (
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Ready
                        </span>
                        {paidStatus.kind === 'paid' && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                                style={{ background: `${accent}1f`, color: accent }}
                            >
                                Paid
                            </span>
                        )}
                        {paidStatus.kind === 'partial' && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                                style={{ background: `${accent}1f`, color: accent }}
                            >
                                {paidStatus.count}/{paidStatus.total} languages
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black dark:text-white">
                        <LockIcon className="w-3 h-3" />
                        Coming Soon
                    </span>
                )}
            </div>

            {/* Title + one-line focus */}
            <h3 className="text-[20px] font-bold text-black dark:text-white tracking-tight leading-snug mb-2">
                {exam.title}
            </h3>
            <p className="text-[13px] text-black dark:text-white leading-relaxed mb-5 line-clamp-3">
                {focus || exam.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-5">
                {exam.tags.slice(0, 4).map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-black dark:text-white"
                    >
                        {tag}
                    </span>
                ))}
            </div>

            {/* How this helps */}
            {helpfulFor.length > 0 && (
                <div className="mb-5">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-black dark:text-white mb-2.5">
                        How This Helps You
                    </p>
                    <ul className="flex flex-col gap-1.5">
                        {helpfulFor.map((item) => (
                            <li
                                key={item}
                                className="flex items-start gap-2 text-[12.5px] text-black dark:text-white leading-relaxed"
                            >
                                <span
                                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                    style={{ background: accent }}
                                />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Meta + CTA */}
            <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-black dark:text-white">
                        {exam.duration} &middot; {exam.questions} Q
                    </span>
                    <span className="text-[10px] text-black dark:text-white uppercase tracking-wider">
                        {exam.difficulty}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onKnowMore}
                    disabled={!isReady}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11.5px] font-bold uppercase tracking-wider transition-all ${isReady
                            ? 'bg-[#1ED36A] hover:bg-[#1bb85c] text-white active:scale-95 cursor-pointer shadow-sm shadow-[#1ED36A]/30'
                            : 'bg-slate-100 dark:bg-white/[0.04] text-black dark:text-white cursor-not-allowed'
                        }`}
                >
                    {isReady ? 'Know More' : 'Notify Me'}
                    {isReady && <ArrowRightIcon className="w-3 h-3" />}
                </button>
            </div>
        </article>
    );
};

const WhyItem: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="flex flex-col gap-2">
        <h4 className="text-[12px] font-bold uppercase tracking-[0.14em] text-black dark:text-white">
            {title}
        </h4>
        <p className="text-[13px] text-black dark:text-white leading-relaxed">
            {description}
        </p>
    </div>
);

export default ExploreView;
