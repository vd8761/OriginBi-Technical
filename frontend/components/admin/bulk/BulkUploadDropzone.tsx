import React, { useCallback, useState } from 'react';

interface BulkUploadDropzoneProps {
    onFileSelected: (file: File) => void;
    onReviewClick: () => void;
    isUploading: boolean;
    uploadProgress: number; // 0-100
    uploadComplete: boolean;
    fileName: string | null;
    error: string | null;
    onReset: () => void;
}

export const BulkUploadDropzone: React.FC<BulkUploadDropzoneProps> = ({
    onFileSelected, onReviewClick, isUploading, uploadProgress, uploadComplete, fileName, error, onReset
}) => {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (isUploading || uploadComplete) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.toLowerCase().endsWith('.csv')) {
                onFileSelected(file);
            } else {
                alert("Invalid file format. Only CSV files are allowed.");
            }
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.name.toLowerCase().endsWith('.csv')) {
                onFileSelected(file);
            } else {
                alert("Invalid file format. Only CSV files are allowed.");
                // Clear input so user can try again
                e.target.value = '';
            }
        }
    };

    if (uploadComplete) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-gray-200 dark:border-[#FFFFFF1F] rounded-xl bg-white dark:bg-[#15171A] h-[400px]">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-[#1ED36A]/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#1ED36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <h3 className="text-[#1ED36A] text-lg font-medium mb-1">Upload complete</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Your file is ready for review</p>

                <div className="bg-gray-50 dark:bg-[#FFFFFF0A] border border-gray-200 dark:border-transparent rounded-lg p-3 w-2/3 max-w-md flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-[#1ED36A]/20 rounded flex items-center justify-center text-[#1ED36A] font-medium text-sm">CSV</div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm text-gray-900 dark:text-white truncate">{fileName}</div>
                        <div className="text-xs text-gray-500">100%</div>
                        <div className="h-1 bg-gray-200 dark:bg-[#FFFFFF1F] mt-1 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1ED36A] w-full"></div>
                        </div>
                    </div>
                    <button onClick={onReset} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex gap-4">
                    <button onClick={onReset} className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">Back</button>
                    <button onClick={onReviewClick} className="px-6 py-2 rounded-lg bg-[#1ED36A] text-white hover:bg-[#1ED36A]/90 font-medium flex items-center gap-2">
                        Review Upload
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                </div>
            </div>
        );
    }

    if (isUploading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-gray-200 dark:border-[#FFFFFF1F] rounded-xl bg-white dark:bg-[#15171A] h-[400px]">
                <div className="mb-6 flex justify-center animate-bounce">
                    <svg className="w-16 h-16 text-[#1ED36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-[#1ED36A] text-lg font-medium mb-1">Uploading your file...</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Please wait while the file is being processed</p>

                <div className="bg-gray-50 dark:bg-[#FFFFFF0A] border border-gray-200 dark:border-transparent rounded-lg p-3 w-2/3 max-w-md flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-[#1ED36A]/20 rounded flex items-center justify-center text-[#1ED36A] font-medium text-sm">CSV</div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm text-gray-900 dark:text-white truncate">{fileName}</div>
                        <div className="text-xs text-gray-500">{uploadProgress}% - {Math.max(0, 3 - Math.floor(uploadProgress / 30))} Seconds Remaining</div>
                        <div className="h-1 bg-gray-200 dark:bg-[#FFFFFF1F] mt-1 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1ED36A] transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                    <button onClick={onReset} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-[400px] block
                ${isDragActive ? 'border-[#1ED36A] bg-[#1ED36A]/5' : 'border-gray-300 dark:border-gray-700 hover:border-[#1ED36A]/50 hover:bg-gray-50 dark:hover:bg-[#FFFFFF05]'}
                ${error ? 'border-red-500 bg-red-500/5' : ''}
            `}
        >
            <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
                disabled={isUploading || uploadComplete}
            />

            <div className="w-16 h-16 bg-gray-100 dark:bg-[#FFFFFF0A] rounded-full flex items-center justify-center mb-4 text-gray-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>

            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Drag & Drop your CSV file here</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">or click to browse from your computer</p>

            {error && (
                <div className="text-red-400 text-sm mt-4 bg-red-500/10 px-4 py-2 rounded">
                    {error}
                </div>
            )}

            <span className="mt-4 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 inline-block">
                Browse Files
            </span>
            <div className="mt-4 text-xs text-gray-500">
                <a href="/sample_bulk_registration.csv" onClick={(e) => e.stopPropagation()} download className="text-[#1ED36A] hover:underline flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Sample CSV
                </a>
            </div>
        </label>
    );
};
