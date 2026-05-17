import React, { useState, useEffect } from 'react';
import {
    bulkAdminUsersPreview,
    bulkAdminUsersExecute,
    getBulkAdminUsersJobStatus,
    getBulkAdminUsersJobRows
} from '../../lib/api';
import { BulkUploadDropzone } from "./bulk/BulkUploadDropzone";
import { BulkReviewTable } from "./bulk/BulkReviewTable";
import { BulkSuccessSummary } from "./bulk/BulkSuccessSummary";

interface BulkUploadRegistrationProps {
    onCancel: () => void;
}

const BulkUploadRegistration: React.FC<BulkUploadRegistrationProps> = ({ onCancel }) => {
    const [view, setView] = useState<'upload' | 'review' | 'processing' | 'success'>('upload');
    const [importId, setImportId] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [groups, setGroups] = useState<any[]>([]); // Tech assessment might not use groups, but leaving for table compatibility

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Review State
    const [validRows, setValidRows] = useState<any[]>([]);
    const [invalidRows, setInvalidRows] = useState<any[]>([]);
    const [isConfirming, setIsConfirming] = useState(false);

    // Success State
    const [summary, setSummary] = useState({ total: 0, success: 0, skipped: 0 });

    useEffect(() => {
        // Mock groups since tech assessments typically don't map to dynamic groups in bulk (yet)
        setGroups([{ id: 1, name: 'Default Tech Group' }]);
    }, []);

    // Polling Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (view === 'processing' && importId) {
            interval = setInterval(async () => {
                try {
                    const status = await getBulkAdminUsersJobStatus(importId);
                    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                        if (status.failed > 0 || status.status === 'FAILED') {
                            const rows = await getBulkAdminUsersJobRows(importId);
                            setValidRows(rows.filter((r: any) => r.status === 'SUCCESS' || r.status === 'READY'));
                            setInvalidRows(rows.filter((r: any) => r.status === 'FAILED' || r.status === 'INVALID'));
                            setView('review');
                        } else {
                            setSummary({
                                total: status.total,
                                success: status.success,
                                skipped: status.total - status.success
                            });
                            setView('success');
                        }
                    }
                } catch (e) {
                    console.error("Polling failed", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [view, importId]);

    const handleFileSelected = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        setError(null);
        setFileName(file.name);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        try {
            const data = await bulkAdminUsersPreview(file);
            clearInterval(progressInterval);
            setUploadProgress(100);

            setImportId(data.importId);
            const rows = data.rows || [];
            setValidRows(rows.filter((r: any) => r.status === 'READY'));
            setInvalidRows(rows.filter((r: any) => r.status !== 'READY'));

            setUploadComplete(true);
        } catch (err: any) {
            clearInterval(progressInterval);
            setIsUploading(false);
            setError(err.message || 'Upload failed');
        }
    };

    const handleReviewClick = () => {
        setView('review');
    };

    const handleConfirm = async (overrides: any[]) => {
        if (!importId) return;
        setIsConfirming(true);
        try {
            await bulkAdminUsersExecute(importId, overrides);
            setView('processing');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleReset = () => {
        setView('upload');
        setImportId(null);
        setFileName(null);
        setValidRows([]);
        setInvalidRows([]);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadComplete(false);
        setError(null);
    };

    return (
        <div className="p-6 bg-brand-light-primary dark:bg-[#0B0D0F] min-h-screen">
            <div className="mb-8">
                <nav className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    Dashboard &gt; <button onClick={onCancel} className="hover:text-gray-900 dark:hover:text-white transition-colors">Users</button> &gt; <span className="text-[#1ED36A]">Bulk Upload</span>
                    {view === 'review' && " > Review Bulk Upload"}
                </nav>
                <h1 className="text-3xl font-bold text-[#150089] dark:text-white mb-2">Bulk Upload Registration {view === 'review' ? '– Review & Confirm' : ''}</h1>
            </div>

            {view === 'upload' && (
                <BulkUploadDropzone
                    onFileSelected={handleFileSelected}
                    onReviewClick={handleReviewClick}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    uploadComplete={uploadComplete}
                    fileName={fileName}
                    error={error}
                    onReset={handleReset}
                />
            )}

            {view === 'review' && (
                <BulkReviewTable
                    validRows={validRows}
                    invalidRows={invalidRows}
                    onConfirm={handleConfirm}
                    onCancel={handleReset}
                    groups={groups}
                    isSubmitting={isConfirming}
                />
            )}

            {view === 'processing' && (
                <div className="flex flex-col items-center justify-center p-12 h-[400px]">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1ED36A] mb-4"></div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">Processing Registrations...</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">This may take a few moments.</p>
                </div>
            )}

            {view === 'success' && (
                <BulkSuccessSummary
                    total={summary.total}
                    success={summary.success}
                    skipped={summary.skipped}
                    onUploadAgain={handleReset}
                    onViewAll={onCancel}
                />
            )}
        </div>
    );
};

export default BulkUploadRegistration;
