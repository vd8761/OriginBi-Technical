"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AssessmentNotification } from "@/lib/assessmentTracker";

interface AssessmentNotificationsProps {
  notifications: AssessmentNotification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

const BellIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const TrophyIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const LightbulbIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ClockIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XIcon = ({ c }: { c?: string }) => (
  <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AssessmentNotifications: React.FC<AssessmentNotificationsProps> = ({
  notifications,
  onMarkRead,
  onClearAll,
}) => {
  const router = useRouter();
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "completed":
        return <TrophyIcon c="w-5 h-5 text-green-600" />;
      case "suggestion":
        return <LightbulbIcon c="w-5 h-5 text-blue-600" />;
      case "reminder":
        return <ClockIcon c="w-5 h-5 text-amber-600" />;
      default:
        return <BellIcon c="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "completed":
        return "bg-green-50 border-green-200";
      case "suggestion":
        return "bg-blue-50 border-blue-200";
      case "reminder":
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const handleAction = (notif: AssessmentNotification) => {
    onMarkRead(notif.id);
    if (notif.action?.href) {
      router.push(notif.action.href);
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <BellIcon c="w-5 h-5 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-sm text-gray-500">{unreadCount} new</span>
          )}
        </div>
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-gray-100">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-4 flex items-start gap-4 ${getBgColor(notif.type)} ${
                !notif.read ? "bg-opacity-70" : "bg-opacity-40"
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{notif.title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onMarkRead(notif.id)}
                    className="flex-shrink-0 p-1 hover:bg-white rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <XIcon c="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {notif.action && (
                  <button
                    onClick={() => handleAction(notif)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1ed36a] text-white text-sm font-bold hover:bg-[#17b55a] transition-colors"
                  >
                    {notif.action.label}
                    <CheckIcon c="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default AssessmentNotifications;
