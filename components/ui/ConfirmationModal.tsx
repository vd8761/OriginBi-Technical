import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = 'warning'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'warning':
                return (
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 border border-amber-500/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case 'success':
                return (
                    <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green mb-4 border border-brand-green/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 border border-blue-500/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-md bg-white dark:bg-brand-dark-primary rounded-[2rem] p-6 border border-brand-light-tertiary dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    {getIcon()}
                    
                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                        {title}
                    </h3>
                    
                    <p className="text-sm font-medium text-black dark:text-white/80 leading-relaxed mb-6">
                        {message}
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-full border border-gray-200 dark:border-white/10 text-black dark:text-white/80 font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 rounded-full bg-brand-green text-white font-medium text-sm hover:bg-brand-green/90 transition-all shadow-md shadow-brand-green/10"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
