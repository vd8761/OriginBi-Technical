"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Trash2, HelpCircle, Info, CheckCircle2 } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success" | "primary";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
  }>({
    open: false,
    options: null,
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({
      open: true,
      options,
    });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  }, []);

  const getIcon = (variant: string) => {
    switch (variant) {
      case "danger":
        return <Trash2 className="text-red-500" size={22} />;
      case "warning":
        return <AlertCircle className="text-amber-500" size={22} />;
      case "success":
        return <CheckCircle2 className="text-brand-green" size={22} />;
      case "info":
        return <Info className="text-blue-500" size={22} />;
      default:
        return <HelpCircle className="text-brand-green" size={22} />;
    }
  };

  const getIconBg = (variant: string) => {
    switch (variant) {
      case "danger":
        return "bg-red-500/10";
      case "warning":
        return "bg-amber-500/10";
      case "success":
        return "bg-brand-green/10";
      case "info":
        return "bg-blue-500/10";
      default:
        return "bg-brand-green/10";
    }
  };

  const getConfirmButtonClass = (variant: string) => {
    switch (variant) {
      case "danger":
        return "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg shadow-red-500/15";
      case "warning":
        return "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-lg shadow-amber-500/15";
      case "success":
        return "bg-brand-green hover:bg-brand-green/90 text-white shadow-lg shadow-brand-green/15";
      case "info":
        return "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-lg shadow-blue-500/15";
      default:
        return "bg-brand-green hover:bg-brand-green/90 text-white shadow-lg shadow-brand-green/15";
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state.open && state.options && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0f1412]/85 backdrop-blur-sm z-0"
              onClick={() => handleClose(false)}
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-[#111814] p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl mb-5 transition-all ${getIconBg(
                    state.options.variant || "primary"
                  )}`}
                >
                  {getIcon(state.options.variant || "primary")}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {state.options.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {state.options.message}
                </p>

                <div className="mt-6 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
                  >
                    {state.options.cancelLabel || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${getConfirmButtonClass(
                      state.options.variant || "primary"
                    )}`}
                  >
                    {state.options.confirmLabel || "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}
