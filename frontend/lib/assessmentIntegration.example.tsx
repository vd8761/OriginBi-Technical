/**
 * EXAMPLE: How to integrate the Evaluation Engine into assessment components
 * 
 * This shows how to update AptitudeEngine, CodingAssessment, etc.
 */

import React, { useCallback, useState } from "react";
import { useAssessmentSubmission, adaptAptitudeAnswers, adaptCodingAnswers } from "./useAssessmentSubmission";
import type { AssessmentId } from "./exams";

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 1: AptitudeEngine Integration
// ─────────────────────────────────────────────────────────────────────────────

export const AptitudeEngineWithEvaluation: React.FC<{
  assessmentCode: string;
  userId?: number;
  onComplete: (result: any) => void;
}> = ({ assessmentCode, userId, onComplete }) => {
  // Use the unified submission hook
  const { submit, state, reset } = useAssessmentSubmission();
  
  // Track time per question for reliability metrics
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [timePerQuestion, setTimePerQuestion] = useState<Record<string, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<string, number>>({});
  
  // ... existing state (questions, answers, etc.)
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600);

  // Track when user views a question
  const handleQuestionView = (questionId: string) => {
    setQuestionStartTimes(prev => ({
      ...prev,
      [questionId]: Date.now()
    }));
  };

  // Track answer changes
  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      // Track change if already answered
      if (prev[questionId] && prev[questionId] !== optionId) {
        setAnswerChanges(changes => ({
          ...changes,
          [questionId]: (changes[questionId] || 0) + 1
        }));
      }
      return { ...prev, [questionId]: optionId };
    });
    
    // Calculate time spent on this question
    const startTime = questionStartTimes[questionId];
    if (startTime) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      setTimePerQuestion(prev => ({
        ...prev,
        [questionId]: timeSpent
      }));
    }
  };

  // Enhanced submit handler
  const handleSubmitAttempt = useCallback(async () => {
    if (!attemptToken || state.isSubmitting) return;
    
    // 1. Prepare enhanced answers with metrics
    const enhancedAnswers = questions.map(q => {
      const timeSpent = timePerQuestion[q.id] || 0;
      const changes = answerChanges[q.id] || 0;
      
      return {
        questionId: q.id,
        selectedOptionId: answers[q.id] || null,
        timeSpentSeconds: timeSpent,
        answerChanges: changes,
      };
    });
    
    // 2. Adapt to evaluation format
    const { rawAnswers, questionMetrics } = adaptAptitudeAnswers(
      answers,
      questions.map(q => ({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty || 'medium',
        marks: q.marks || 2,
        negativeMarks: q.negativeMarks || 0.5,
      })),
      timePerQuestion
    );
    
    // Note: In real implementation, you'd fetch correct answers from backend
    // or have them embedded in questions for local evaluation
    
    // 3. Calculate time taken
    const timeTaken = 3600 - timeLeft; // total - remaining
    
    // 4. Submit with evaluation
    const result = await submit({
      assessmentId: 'aptitude' as AssessmentId,
      attemptToken,
      answers: enhancedAnswers,
      questionMetrics,
      timeTaken,
      totalTimeAllowed: 3600,
    });
    
    if (result) {
      onComplete(result);
    }
    
  }, [attemptToken, state.isSubmitting, questions, answers, timePerQuestion, answerChanges, timeLeft, submit, onComplete]);

  return (
    <div>
      {/* Your existing UI */}
      
      {/* Show submission state */}
      {state.isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl">
            <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Analyzing your performance...</p>
          </div>
        </div>
      )}
      
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          Error: {state.error}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 2: Coding Assessment Integration
// ─────────────────────────────────────────────────────────────────────────────

export const CodingAssessmentWithEvaluation: React.FC<{
  lang: string;
  onComplete: (result: any) => void;
}> = ({ lang, onComplete }) => {
  const { submit, state } = useAssessmentSubmission();
  
  const [submissions, setSubmissions] = useState<Array<{
    questionId: string | number;
    code: string;
    language: string;
    testCasesPassed: number;
    totalTestCases: number;
    timeSpent: number;
  }>>([]);
  
  const handleSubmit = useCallback(async () => {
    // 1. Adapt coding submissions
    const { rawAnswers, questionMetrics } = adaptCodingAnswers(
      submissions,
      submissions.reduce((sum, s) => sum + s.timeSpent, 0)
    );
    
    const timeTaken = submissions.reduce((sum, s) => sum + s.timeSpent, 0);
    
    // 2. Submit
    const result = await submit({
      assessmentId: 'coding',
      attemptToken: 'coding-token', // Get from your context
      answers: rawAnswers,
      questionMetrics,
      timeTaken,
      totalTimeAllowed: 5400, // 90 minutes
    });
    
    if (result) {
      onComplete(result);
    }
  }, [submissions, submit, onComplete]);
  
  // ... rest of component
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE 3: Displaying Evaluation Results
// ─────────────────────────────────────────────────────────────────────────────

export const EvaluationResultDisplay: React.FC<{
  result: any; // EvaluationResult
}> = ({ result }) => {
  if (!result) return null;
  
  const {
    overallScore,
    grade,
    skillLevel,
    certificationLevel,
    isCertified,
    certificateId,
    scoreMetrics,
    timeMetrics,
    reliabilityMetrics,
    sections,
    strengths,
    improvements,
    insights,
  } = result;
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1ed36a] to-[#10b981] rounded-3xl p-8 text-white mb-8">
        <h1 className="text-4xl font-bold mb-2">Assessment Complete!</h1>
        <div className="flex items-center gap-4 mt-4">
          <div className="text-5xl font-black">{overallScore}%</div>
          <div>
            <p className="text-xl font-semibold">{grade} Grade</p>
            <p className="text-white/80">{skillLevel} Level</p>
          </div>
        </div>
        
        {isCertified && (
          <div className="mt-6 bg-white/20 backdrop-blur rounded-xl p-4 inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#1ed36a]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">{certificationLevel?.toUpperCase()} Certified</p>
              <p className="text-xs text-white/70 font-mono">{certificateId}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Accuracy" value={`${scoreMetrics.accuracy.toFixed(1)}%`} color="blue" />
        <MetricCard label="Completion" value={`${scoreMetrics.completionRate.toFixed(0)}%`} color="green" />
        <MetricCard label="Percentile" value={`Top ${(100 - scoreMetrics.percentileRank).toFixed(0)}%`} color="purple" />
        <MetricCard label="Reliability" value={`${reliabilityMetrics.confidenceScore.toFixed(0)}%`} color="amber" />
      </div>
      
      {/* Time Metrics */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Time Analysis</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Time Taken</p>
            <p className="text-lg font-semibold">{Math.floor(timeMetrics.timeTaken / 60)}m</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg per Question</p>
            <p className="text-lg font-semibold">{Math.floor(timeMetrics.avgTimePerQuestion)}s</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time Efficiency</p>
            <p className="text-lg font-semibold">{timeMetrics.timeEfficiency.toFixed(0)}%</p>
          </div>
        </div>
        {timeMetrics.rushingScore > 30 && (
          <p className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            ⚠️ You answered {timeMetrics.rushingScore.toFixed(0)}% of questions very quickly. 
            Consider taking more time to read carefully.
          </p>
        )}
      </div>
      
      {/* Reliability Flags */}
      {reliabilityMetrics.flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-amber-800 mb-3">Response Analysis</h3>
          <ul className="space-y-2">
            {reliabilityMetrics.flags.map((flag: string, i: number) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Section Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Section Performance</h3>
        <div className="space-y-4">
          {sections.map((section: any) => (
            <div key={section.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-700">{section.name}</span>
                <span className={`font-bold ${section.isPassed ? 'text-green-600' : 'text-red-500'}`}>
                  {section.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${section.isPassed ? 'bg-[#1ed36a]' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(100, section.percentage)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {section.correctCount}/{section.totalQuestions} correct • Weight: {(section.weight * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-green-50 rounded-2xl p-6">
          <h3 className="font-bold text-green-800 mb-3">💪 Strengths</h3>
          <ul className="space-y-2">
            {strengths.map((s: string, i: number) => (
              <li key={i} className="text-sm text-green-700">{s}</li>
            ))}
          </ul>
        </div>
        
        {/* Improvements */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="font-bold text-blue-800 mb-3">📈 Areas to Improve</h3>
          <ul className="space-y-2">
            {improvements.map((imp: string, i: number) => (
              <li key={i} className="text-sm text-blue-700">{imp}</li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Detailed Insights */}
      <div className="mt-6 bg-gray-50 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Personalized Insights</h3>
        <div className="space-y-3">
          {insights.map((insight: any, i: number) => (
            <div 
              key={i} 
              className={`p-4 rounded-xl ${
                insight.type === 'strength' ? 'bg-green-100 text-green-800' :
                insight.type === 'improvement' ? 'bg-blue-100 text-blue-800' :
                insight.type === 'time' ? 'bg-amber-100 text-amber-800' :
                'bg-purple-100 text-purple-800'
              }`}
            >
              <p className="text-sm font-medium">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper component
const MetricCard: React.FC<{ label: string; value: string; color: string }> = ({ 
  label, value, color 
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  
  return (
    <div className={`${colorClasses[color]} rounded-xl p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider font-semibold opacity-70">{label}</p>
    </div>
  );
};
