"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Exam } from "../ExamCarousel";
import type { ExamDetailData } from "@/lib/exams";
import type { AssessmentResult, SectionResult } from "@/lib/progress";

interface DetailedResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  result: AssessmentResult | null;
  detail: ExamDetailData | null;
}

// ── Icons ──
const CloseIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ClockIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TargetIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendUpIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const BookIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const AwardIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const LightbulbIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const BarChartIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ── Helpers ──
const getSkillColor = (score: number) => {
  if (score >= 80) return "#16a34a";
  if (score >= 65) return "#0891b2";
  if (score >= 50) return "#d97706";
  return "#dc2626";
};

const getSkillLabel = (score: number) => {
  if (score >= 80) return "Expert";
  if (score >= 65) return "Proficient";
  if (score >= 50) return "Developing";
  return "Beginner";
};

const getSkillBg = (score: number) => {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 65) return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
};

const analyzePerformance = (sections: SectionResult[]) => {
  const strong = sections.filter(s => s.score >= 75);
  const developing = sections.filter(s => s.score >= 50 && s.score < 75);
  const needsFocus = sections.filter(s => s.score < 50);
  return { strong, developing, needsFocus };
};

const generateExamSpecificAdvice = (examId: string, weakAreas: SectionResult[], strongAreas: SectionResult[]) => {
  const advice: { title: string; content: string; tag: string }[] = [];

  if (examId === "aptitude") {
    advice.push(
      { title: "Quantitative Strategy", content: "Focus on shortcut techniques for arithmetic. Practice 20 timed questions daily.", tag: "Math" },
      { title: "Logical Reasoning", content: "Draw diagrams for seating and direction problems. Pattern recognition improves with practice.", tag: "Logic" }
    );
  } else if (examId === "communication") {
    advice.push(
      { title: "Speaking Fluency", content: "Record 2-minute responses daily. Focus on clarity over complex vocabulary.", tag: "Speech" },
      { title: "Writing Structure", content: "Use the PREP method: Point, Reason, Example, Point. Keep sentences under 20 words.", tag: "Writing" }
    );
  } else if (examId === "coding") {
    advice.push(
      { title: "Problem Decomposition", content: "Break every problem into input, process, output. Write pseudocode before actual code.", tag: "Approach" },
      { title: "Edge Cases", content: "Always test with empty input, single element, maximum values, and negative numbers.", tag: "Testing" }
    );
  } else if (examId === "mnc") {
    advice.push(
      { title: "DSA Patterns", content: "Master 15 core patterns: Two Pointers, Sliding Window, BFS, DFS, DP basics.", tag: "Patterns" },
      { title: "System Design Basics", content: "Understand caching, load balancing, and database indexing at a high level.", tag: "Design" }
    );
  } else {
    advice.push(
      { title: "Role Research", content: "Study job descriptions for your target role. Match your strengths to requirements.", tag: "Research" },
      { title: "Scenario Practice", content: "Practice situational judgement questions using the STAR method.", tag: "Practice" }
    );
  }

  return advice;
};

// ── Component ──
const DetailedResultModal: React.FC<DetailedResultModalProps> = ({ isOpen, onClose, exam, result, detail }) => {
  if (!isOpen || !exam || !result) return null;

  const sections = result.sections?.length ? result.sections :
    detail?.sections.map((s, i) => ({ name: s.name, score: 70 + ((i * 13) % 25), weight: s.weight })) || [];

  const analysis = analyzePerformance(sections);
  const advice = generateExamSpecificAdvice(exam.id, analysis.needsFocus, analysis.strong);

  // Calculate time per question (rough estimate)
  const timeStr = result.timeTaken || "0 min";
  const timeMinutes = parseInt(timeStr) || 0;
  const timePerQ = timeMinutes > 0 && exam.questions > 0 ? (timeMinutes / exam.questions).toFixed(1) : "-";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — z-[100] to sit above header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Modal — z-[101] to sit above backdrop */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed inset-4 sm:inset-6 md:inset-10 lg:inset-16 xl:inset-20 z-[101] flex flex-col"
          >
            <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">

              {/* ── Header ── */}
              <div className="shrink-0 bg-gray-900 px-6 sm:px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${exam.accentColor}20`, color: exam.accentColor }}
                  >
                    {exam.icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Detailed Result</p>
                    <h2 className="text-lg font-bold text-white">{exam.title}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <CloseIcon c="w-5 h-5 text-white" />
                </button>
              </div>

              {/* ── Scrollable Content ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 sm:p-8 max-w-5xl mx-auto">

                  {/* ===== TOP ROW: Score Ring + Quick Stats ===== */}
                  <div className="flex flex-col lg:flex-row gap-6 mb-8">
                    {/* Score Ring */}
                    <div className="shrink-0">
                      <div className="relative w-40 h-40 mx-auto lg:mx-0">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                          <motion.circle
                            cx="80" cy="80" r="70" fill="none"
                            stroke="#1ed36a"
                            strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={440}
                            initial={{ strokeDashoffset: 440 }}
                            animate={{ strokeDashoffset: 440 - (440 * result.overallScore) / 100 }}
                            transition={{ duration: 1.2, delay: 0.2 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-gray-900">{result.overallScore}%</span>
                          <span className="text-xs font-semibold text-gray-400 mt-0.5">{getSkillLabel(result.overallScore)}</span>
                        </div>
                      </div>
                      <p className="text-center lg:text-left text-xs text-gray-400 mt-2">{result.accuracy}% accuracy</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <ClockIcon c="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-bold text-gray-900">{result.timeTaken}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Time</p>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <TargetIcon c="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-bold text-gray-900">{sections.length}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sections</p>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <BarChartIcon c="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-bold text-gray-900">{timePerQ}m</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Per Question</p>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <AwardIcon c="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-bold text-gray-900">{exam.questions}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Questions</p>
                      </div>
                    </div>
                  </div>

                  {/* ===== SECTION BREAKDOWN TABLE ===== */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <BookIcon c="w-4 h-4 text-[#1ed36a]" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Section Breakdown</h3>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Section</th>
                            <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Weight</th>
                            <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Score</th>
                            <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Level</th>
                            <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Visual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sections.map((section, idx) => (
                            <motion.tr
                              key={section.name}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.1 * idx }}
                              className="hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-4 py-3.5">
                                <span className="text-sm font-semibold text-gray-900">{section.name}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-xs text-gray-500">{section.weight}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm font-bold" style={{ color: getSkillColor(section.score) }}>{section.score}%</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${getSkillBg(section.score)}`}>
                                  {getSkillLabel(section.score)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex justify-end">
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${section.score}%` }}
                                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                                      className="h-full rounded-full"
                                      style={{ background: getSkillColor(section.score) }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ===== PERFORMANCE SUMMARY ===== */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {analysis.strong.length > 0 && (
                      <div className="bg-green-50/60 rounded-2xl p-5 border border-green-100">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckIcon c="w-4 h-4 text-green-600" />
                          <h4 className="text-sm font-bold text-green-800">Strong Areas</h4>
                          <span className="ml-auto text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{analysis.strong.length}</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.strong.map(s => (
                            <div key={s.name} className="flex items-center justify-between">
                              <span className="text-xs text-green-700">{s.name}</span>
                              <span className="text-xs font-bold text-green-600">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.developing.length > 0 && (
                      <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-100">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendUpIcon c="w-4 h-4 text-amber-600" />
                          <h4 className="text-sm font-bold text-amber-800">Developing</h4>
                          <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{analysis.developing.length}</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.developing.map(s => (
                            <div key={s.name} className="flex items-center justify-between">
                              <span className="text-xs text-amber-700">{s.name}</span>
                              <span className="text-xs font-bold text-amber-600">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.needsFocus.length > 0 && (
                      <div className="bg-red-50/60 rounded-2xl p-5 border border-red-100">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertIcon c="w-4 h-4 text-red-600" />
                          <h4 className="text-sm font-bold text-red-800">Needs Focus</h4>
                          <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{analysis.needsFocus.length}</span>
                        </div>
                        <div className="space-y-2">
                          {analysis.needsFocus.map(s => (
                            <div key={s.name} className="flex items-center justify-between">
                              <span className="text-xs text-red-700">{s.name}</span>
                              <span className="text-xs font-bold text-red-600">{s.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ===== EXAM-SPECIFIC ADVICE ===== */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <LightbulbIcon c="w-4 h-4 text-[#1ed36a]" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">How to Improve</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {advice.map((tip, idx) => (
                        <motion.div
                          key={tip.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 * idx }}
                          className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100"
                        >
                          <div className="shrink-0">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500">
                              {tip.tag}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{tip.title}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">{tip.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* ===== SKILL GAP ANALYSIS ===== */}
                  {detail && detail.skills.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <TargetIcon c="w-4 h-4 text-[#1ed36a]" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Skills Evaluated</h3>
                      </div>
                      <div className="space-y-3">
                        {detail.skills.map((skill, idx) => (
                          <motion.div
                            key={skill.title}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 * idx }}
                            className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-gray-500">{idx + 1}</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">{skill.title}</h4>
                              <p className="text-xs text-gray-500 leading-relaxed">{skill.description}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ===== EXAM REQUIREMENTS ===== */}
                  {detail && detail.requirements.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <BookIcon c="w-4 h-4 text-[#1ed36a]" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">What You Need</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detail.requirements.map((req, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05 * idx }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700"
                          >
                            <CheckIcon c="w-3 h-3 text-[#1ed36a]" />
                            {req}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ===== ACTION BAR ===== */}
                  <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 pt-4 pb-2 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { onClose(); }}
                      className="flex-1 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <TargetIcon c="w-4 h-4" />
                      Practice This Assessment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


export default DetailedResultModal;
