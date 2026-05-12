import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  X,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  accentColor = "emerald",
  gradient = "from-emerald-500 to-teal-600"
}) => {
  const router = useRouter();
  const [isAdaptive, setIsAdaptive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockConfig, setBlockConfig] = useState<any>(null);

  useEffect(() => {
    const checkAdaptiveMode = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_TECH_API_URL || "http://localhost:5000";
        const response = await fetch(`${API_BASE}/api/assessment/admin/assessments?moduleType=aptitude`);
        
        if (response.ok) {
          const data = await response.json();
          const aptitudeAssessment = data.data?.[0];
          
          if (aptitudeAssessment?.block_config?.enabled) {
            setIsAdaptive(true);
            setBlockConfig(aptitudeAssessment.block_config);
          } else {
            setIsAdaptive(false);
          }
        } else {
          setIsAdaptive(false);
        }
      } catch (error) {
        console.error('Failed to check adaptive mode:', error);
        setIsAdaptive(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdaptiveMode();
  }, []);

  const handleStart = () => {
    if (isAdaptive) {
      // Navigate to adaptive assessment
      router.push(`/assessment/aptitude/adaptive?mode=${mode}`);
    } else {
      // Use regular assessment
      onStart(mode);
    }
    onClose();
  };

  if (isLoading) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-[#111a15] rounded-2xl p-8 max-w-md w-full mx-4 border border-brand-green/20"
          >
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Checking assessment configuration...</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-[#111a15] rounded-2xl p-8 max-w-lg w-full mx-4 border border-brand-green/20 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div 
                className={`p-2 rounded-xl text-white ${!gradient.includes("linear-gradient") ? `bg-gradient-to-br ${gradient}` : ""}`}
                style={gradient.includes("linear-gradient") ? { background: gradient } : {}}
              >
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Aptitude Assessment
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {mode === 'trial' ? 'Practice Mode' : 'Certified Assessment'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Assessment Type Indicator */}
          {isAdaptive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Adaptive Assessment
                </span>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Questions will adapt to your performance level. The difficulty adjusts based on your answers to provide a personalized experience.
              </p>
            </motion.div>
          )}

          {/* Features */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mt-0.5">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {isAdaptive ? 'Block-Based Structure' : 'Comprehensive Coverage'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {isAdaptive 
                    ? `${blockConfig?.blocksPerAssessment || 4} blocks with ${blockConfig?.questionsPerBlock || 5} questions each. Progress through adaptive difficulty levels.`
                    : '20 questions covering quantitative aptitude, logical reasoning, and verbal ability.'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mt-0.5">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Time Management
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {isAdaptive 
                    ? `${blockConfig?.blocksPerAssessment || 4} blocks with individual time limits for focused performance.`
                    : '60 minutes total duration to complete all questions.'
                  }
                </p>
              </div>
            </div>

            {isAdaptive && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mt-0.5">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Smart Navigation
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Navigate freely within blocks. Previous blocks become read-only as you progress.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mode-specific info */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 mb-6">
            <div className="flex items-center gap-2 mb-2">
              {mode === 'trial' ? (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                    Practice Mode
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                    Certified Assessment
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {mode === 'trial' 
                ? 'Perfect for practice. Get familiar with the format without any pressure.'
                : 'Official assessment attempt. Your performance will be recorded and certified.'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${!gradient.includes("linear-gradient") ? `bg-gradient-to-r ${gradient}` : ""}`}
              style={gradient.includes("linear-gradient") ? { background: gradient } : {}}
            >
              Start Assessment
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Terms */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            By starting, you agree to our terms and assessment guidelines.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdaptiveAptitudePreTest;
