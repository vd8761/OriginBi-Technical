import React from 'react';

interface BulkSuccessSummaryProps {
    total: number;
    success: number;
    skipped: number;
    onUploadAgain: () => void;
    onViewAll: () => void;
}

export const BulkSuccessSummary: React.FC<BulkSuccessSummaryProps> = ({ total, success, skipped, onUploadAgain, onViewAll }) => {
    return (
        <div className="flex flex-col h-full w-full items-center justify-center font-sans space-y-8 animate-fade-in py-12">
            <div className="text-center">
                <div className="w-24 h-24 bg-[#1ED36A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-[#1ED36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Bulk Registration Completed Successfully</h2>
                <p className="text-gray-500 dark:text-gray-400">{success} records have been added successfully</p>
            </div>

            <div className="bg-white dark:bg-[#15171A] rounded-xl border border-gray-200 dark:border-[#FFFFFF1F] p-8 flex flex-col sm:flex-row gap-8 sm:gap-12 text-center min-w-[500px] justify-center shadow-xl">
                <div className="flex-1">
                    <div className="flex justify-center mb-2">
                        <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1 tracking-wider">Total records</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{total}</div>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                <div className="flex-1">
                    <div className="flex justify-center mb-2">
                        <svg className="w-8 h-8 text-[#1ED36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1 tracking-wider">Successfully Registered</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{success}</div>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                <div className="flex-1">
                    <div className="flex justify-center mb-2">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1 tracking-wider">Skipped / Issues</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{skipped}</div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={onViewAll} className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium flex items-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    View All Registrations
                </button>
                <button onClick={onUploadAgain} className="px-6 py-2.5 rounded-lg bg-[#1ED36A] text-white hover:bg-[#1ED36A]/90 font-medium flex items-center gap-2 shadow-lg shadow-[#1ED36A]/20 transition-all">
                    Upload Again
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
            </div>
        </div>
    );
};
