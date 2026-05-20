"use client";

import React from "react";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle,
  SkipForward, Clock, Target, BarChart3, Shield, Zap,
  BookOpen, AlertTriangle, ChevronRight,
} from "lucide-react";
import type { AdaptiveFinalReport, Difficulty, TopicMastery } from "@/lib/adaptiveApi";

interface Props {
  report: AdaptiveFinalReport;
  onClose?: () => void;
}

const difficultyColor = (d: Difficulty) => ({
  easy:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard:   "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}[d]);

const difficultyIcon = (d: Difficulty) => {
  if (d === "easy")   return <TrendingDown className="h-3 w-3" />;
  if (d === "medium") return <Minus className="h-3 w-3" />;
  return <TrendingUp className="h-3 w-3" />;
};

const levelColor = (level: string) => {
  if (level === "Excellent") return "text-emerald-600 dark:text-emerald-400";
  if (level === "Good")      return "text-blue-600 dark:text-blue-400";
  if (level === "Average")   return "text-amber-600 dark:text-amber-400";
  if (level === "Basic")     return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

const masteryColor = (level: string) => {
  if (level === "Strong")   return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (level === "Moderate") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
};

const reliabilityColor = (level: string) => {
  if (level === "High")   return "text-emerald-600 dark:text-emerald-400";
  if (level === "Medium") return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const ScoreRing: React.FC<{ score: number; size?: number; label: string }> = ({ score, size = 80, label }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-slate-200 dark:text-white/10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="text-center -mt-[calc(80px/2+8px)] relative z-10 pointer-events-none" style={{ marginTop: -(size / 2 + 4) }}>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{score.toFixed(0)}</p>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">{label}</p>
    </div>
  );
};

const AdaptiveReportV2: React.FC<Props> = ({ report, onClose }) => {
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  return (
    <div className="min-h-screen bg-[#f6f8f5] dark:bg-[#0f1712] py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-brand-green uppercase tracking-wider mb-1">Adaptive Assessment Report</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {report.obtainedMarks.toFixed(1)} / {report.totalMarks} marks
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {report.marksPercentage.toFixed(1)}% · {formatTime(report.timeTakenSeconds)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black ${levelColor(report.performanceLevel)}`}>
                {report.performanceLevel}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Final Score: <strong>{report.finalEvaluationScore.toFixed(1)}</strong>
              </p>
              <p className={`text-xs font-semibold mt-0.5 ${reliabilityColor(report.reliabilityLevel)}`}>
                <Shield className="h-3 w-3 inline mr-1" />
                {report.reliabilityLevel} Reliability ({report.reliabilityScore.toFixed(0)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Score rings */}
        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Performance Breakdown</h2>
          <div className="flex flex-wrap justify-around gap-6">
            <ScoreRing score={report.marksPercentage} label="Marks %" />
            <ScoreRing score={report.difficultyHandling} label="Difficulty" />
            <ScoreRing score={report.topicMasteryScore} label="Topic Mastery" />
            <ScoreRing score={report.speedEfficiency} label="Speed" />
            <ScoreRing score={report.skipConfidence} label="Skip Confidence" />
            <ScoreRing score={report.reliabilityScore} label="Reliability" />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: "Correct", value: report.correctAnswers },
            { icon: <XCircle className="h-4 w-4 text-red-500" />, label: "Wrong", value: report.wrongAnswers },
            { icon: <SkipForward className="h-4 w-4 text-amber-500" />, label: "Skipped", value: report.skippedQuestions },
            { icon: <Target className="h-4 w-4 text-blue-500" />, label: "Attempted", value: report.attemptedQuestions },
            { icon: <Clock className="h-4 w-4 text-slate-500" />, label: "Avg/Question", value: `${report.avgTimePerQuestion.toFixed(0)}s` },
            { icon: <BarChart3 className="h-4 w-4 text-purple-500" />, label: "Skip Impact", value: `${report.skipImpact.toFixed(1)}%` },
            { icon: <Zap className="h-4 w-4 text-amber-500" />, label: "Speed Eff.", value: `${report.speedEfficiency.toFixed(1)}%` },
            { icon: <Shield className="h-4 w-4 text-brand-green" />, label: "Reliability", value: `${report.reliabilityScore.toFixed(0)}%` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-slate-500 dark:text-slate-400">{label}</p></div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Adaptive path */}
        <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Adaptive Journey</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {report.adaptivePath.map((d, i) => (
              <React.Fragment key={i}>
                <span className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${difficultyColor(d)}`}>
                  {difficultyIcon(d)} Block {i + 1}: {d}
                </span>
                {i < report.adaptivePath.length - 1 && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </React.Fragment>
            ))}
          </div>
          {/* Block performance table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  {["Block", "Difficulty", "Marks%", "Accuracy", "Skip Impact", "Readiness"].map(h => (
                    <th key={h} className="pb-2 text-left font-semibold text-slate-500 dark:text-slate-400 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.blockPerformance.map((b: any) => (
                  <tr key={b.blockNumber} className="border-b border-slate-50 dark:border-white/5">
                    <td className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">B{b.blockNumber}</td>
                    <td className="py-2 pr-4">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold w-fit ${difficultyColor(b.difficulty)}`}>
                        {difficultyIcon(b.difficulty)} {b.difficulty}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{Number(b.marksScore).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{Number(b.adaptiveAccuracy).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{Number(b.skipImpact).toFixed(1)}%</td>
                    <td className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-300">{Number(b.blockReadinessScore).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Topic mastery */}
        {report.topicMastery.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Topic Mastery</h2>
            <div className="space-y-2">
              {report.topicMastery.map((t: TopicMastery) => (
                <div key={`${t.category}-${t.subcategory}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{t.subcategory}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">{t.category}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.topicMasteryScore.toFixed(0)}%</p>
                      <p className="text-[10px] text-slate-500">{t.correctCount}/{t.totalQuestions} correct</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${masteryColor(t.masteryLevel)}`}>
                      {t.masteryLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendedTopics.length > 0 && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">Recommended Practice</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.recommendedTopics.map(t => (
                <span key={t} className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reliability note */}
        {report.reliabilityLevel !== "High" && (
          <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Adaptive Reliability: {report.reliabilityLevel}.</strong>{" "}
                {report.reliabilityDetail?.changeDetails?.length ?? 0} answer(s) were changed after the adaptive path was generated.
                Final marks are valid, but the adaptive journey should be interpreted carefully.
              </p>
            </div>
          </div>
        )}

        {onClose && (
          <div className="flex justify-center">
            <button onClick={onClose}
              className="px-8 py-3 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green/90 shadow-sm">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptiveReportV2;
