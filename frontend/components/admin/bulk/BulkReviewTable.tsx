import React, { useState } from 'react';

interface BulkReviewTableProps {
    validRows: any[];
    invalidRows: any[];
    onConfirm: (overrides: any[]) => void;
    onCancel: () => void;
    groups: any[]; // For dropdown
    isSubmitting?: boolean;
}

export const BulkReviewTable: React.FC<BulkReviewTableProps> = ({ validRows, invalidRows, onConfirm, onCancel, groups, isSubmitting }) => {
    const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid');
    const [overrides, setOverrides] = useState<Record<number, string>>({}); // rowIndex -> groupId

    const handleGroupChange = (rowIndex: number, groupId: string) => {
        setOverrides(prev => ({ ...prev, [rowIndex]: groupId }));
    };

    const handleRegister = () => {
        // Convert overrides map to array
        const overrideArray = Object.entries(overrides).map(([idx, grpId]) => ({
            row_index: Number(idx),
            group_id: grpId
        }));
        onConfirm(overrideArray);
    };

    const renderCell = (row: any, keys: string[], formatter?: (val: any) => any) => {
        let val: any = '-';
        for (const k of keys) {
            if (row.rawData[k] !== undefined && row.rawData[k] !== null && row.rawData[k] !== '') {
                val = row.rawData[k];
                break;
            }
        }

        if (val === '-') return '-';

        if (formatter) {
            val = formatter(val);
        }

        const isErrorSource = row.status === 'INVALID' && row.errorMessage && String(row.errorMessage).includes(String(val));

        return (
            <span className={isErrorSource ? "text-red-500 font-medium" : "text-gray-600 dark:text-gray-300"}>
                {val}
            </span>
        );
    };

    const renderTable = (rows: any[], isValid: boolean) => (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                <thead className="bg-gray-100 dark:bg-[#19211C] text-xs uppercase text-gray-500">
                    <tr>
                        <th className="px-4 py-3">S.No</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3">Program</th>
                        <th className="px-4 py-3">Group Match</th>
                        <th className="px-4 py-3">School Level</th>
                        <th className="px-4 py-3">Stream</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Degree</th>
                        <th className="px-4 py-3">Year</th>
                        <th className="px-4 py-3">Current Role</th>
                        <th className="px-4 py-3">Role Description</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3">End Date</th>
                        <th className="px-4 py-3">Password</th>
                        <th className="px-4 py-3">Send Email</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#FFFFFF0D]">
                    {rows.map((row, idx) => {
                        const hasError = row.status === 'INVALID' || row.errorMessage;

                        const programVal = row.rawData['ProgramId'] || row.rawData['program_code'] || '';
                        const isCollege = String(programVal).toUpperCase().includes('COLLEGE');
                        const isSchool = String(programVal).toUpperCase().includes('SCHOOL');

                        return (
                            <React.Fragment key={idx}>
                                <tr className={`hover:bg-gray-50 dark:hover:bg-[#FFFFFF05] ${hasError ? 'bg-red-500/5' : ''}`}>
                                    <td className="px-4 py-3">{row.rowIndex}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{renderCell(row, ['FullName', 'Name', 'full_name', 'name'])}</td>
                                    <td className="px-4 py-3">{renderCell(row, ['Gender', 'gender'])}</td>
                                    <td className="px-4 py-3">{renderCell(row, ['Email', 'email'])}</td>
                                    <td className="px-4 py-3">
                                        {renderCell(row, ['CountryCode', 'country_code'], (val) => String(val).startsWith('+') ? val : '+' + val)} {renderCell(row, ['Mobile', 'mobile', 'mobile_number'])}
                                    </td>
                                    <td className="px-4 py-3">{renderCell(row, ['ProgramId', 'program_code'])}</td>
                                    <td className="px-4 py-3">
                                        {renderCell(row, ['GroupName', 'group_name'])}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isSchool ? renderCell(row, ['SchoolLevel', 'school_level']) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isSchool ? renderCell(row, ['SchoolStream', 'school_stream']) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isCollege ? renderCell(row, ['DepartmentId', 'department_degree', 'department']) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isCollege ? renderCell(row, ['Degree', 'degree']) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isCollege ? renderCell(row, ['CurrentYear', 'current_year']) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {renderCell(row, ['CurrentRole', 'current_role', 'currentRole', 'Current Role'])}
                                    </td>
                                    <td className="px-4 py-3 max-w-[200px] truncate" title={String(row.rawData['RoleDescription'] || row.rawData['role_description'] || row.rawData['Role Description'] || '')}>
                                        {renderCell(row, ['RoleDescription', 'role_description', 'roleDescription', 'Role Description'])}
                                    </td>
                                    <td className="px-4 py-3">{renderCell(row, ['ExamStart', 'exam_start_date'])}</td>
                                    <td className="px-4 py-3">{renderCell(row, ['ExamEnd', 'exam_end_date'])}</td>
                                    <td className="px-4 py-3 blur-[2px] hover:blur-none transition-all cursor-pointer select-none">
                                        {renderCell(row, ['Password', 'password'])}
                                    </td>
                                    <td className="px-4 py-3">{renderCell(row, ['SendEmail', 'send_email'])}</td>
                                </tr>
                                {hasError && (
                                    <tr>
                                        <td colSpan={18} className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
                                            <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Error: {row.errorMessage}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="w-full space-y-6">


            <div className="flex gap-4">
                <button
                    onClick={() => setActiveTab('valid')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${activeTab === 'valid' ? 'bg-[#1ED36A]/10 border-[#1ED36A] text-[#1ED36A]' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    Valid Records ({validRows.length})
                </button>
                <button
                    onClick={() => setActiveTab('invalid')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${activeTab === 'invalid' ? 'bg-red-500/10 border-red-500 text-red-500' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    Records Needing Attention ({invalidRows.length})
                </button>
            </div>

            <div className="bg-white dark:bg-[#15171A] rounded-xl border border-gray-200 dark:border-[#FFFFFF1F] p-4">
                {activeTab === 'valid' ? renderTable(validRows, true) : renderTable(invalidRows, false)}
            </div>

            {activeTab === 'invalid' && invalidRows.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                    <h4 className="text-red-400 font-medium flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        You have {invalidRows.length} records that must be fixed.
                    </h4>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => {
                                const headers = ['Row No', 'Name', 'Email', 'Mobile', 'Error Message'];
                                const csvContent = [
                                    headers.join(','),
                                    ...invalidRows.map(row => {
                                        const name = row.rawData['FullName'] || row.rawData['Name'] || row.rawData['full_name'] || '';
                                        const email = row.rawData['Email'] || row.rawData['email'] || '';
                                        const mobile = row.rawData['Mobile'] || row.rawData['mobile'] || row.rawData['mobile_number'] || '';
                                        // Escape double quotes in error message
                                        const error = `"${(row.errorMessage || '').replace(/"/g, '""')}"`;
                                        return [row.rowIndex, name, email, mobile, error].join(',');
                                    })
                                ].join('\n');

                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', 'bulk_upload_errors.csv');
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        >
                            Download Error Report
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
                <button onClick={onCancel} className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">Back</button>
                <button
                    onClick={handleRegister}
                    className={`px-6 py-2 rounded-lg font-medium transition-all
                        ${(validRows.length > 0)
                            ? 'bg-[#1ED36A] text-white hover:bg-[#1ED36A]/90'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
                        }`}
                    disabled={!(validRows.length > 0) || isSubmitting}
                >
                    {isSubmitting ? 'Processing...' : 'Confirm & Register'}
                </button>
            </div>
        </div>
    );
};
