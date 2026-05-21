import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    onOpenChange?: (isOpen: boolean) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, onOpenChange, placeholder = "Select", label, required, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                onOpenChange?.(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onOpenChange]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        onOpenChange?.(false);
    };

    const toggleOpen = () => {
        const next = !isOpen;
        setIsOpen(next);
        onOpenChange?.(next);
    };

    return (
        <div className={`w-full ${className || ''}`} ref={containerRef}>
            {label && (
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40 ml-1 block mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={toggleOpen}
                    className={`w-full flex items-center justify-between bg-white dark:bg-white/[0.03] border rounded-xl px-4 py-[11px] text-[13px] font-bold transition-all duration-200 focus:outline-none ${isOpen ? 'border-brand-green/40 ring-4 ring-brand-green/5' : 'border-slate-200 dark:border-white/10 hover:border-brand-green/20'}`}
                >
                    <span className={selectedOption ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/20"}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-green' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#141a17] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`w-full text-left px-4 py-3 text-[13px] transition-colors font-bold border-b border-gray-100 dark:border-white/5 last:border-0 ${String(value) === String(option.value)
                                    ? 'bg-brand-green text-white'
                                    : 'text-slate-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">No options available</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
