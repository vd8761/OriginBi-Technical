const fs = require('fs');
const file = 'c:/Users/Jaya Krishna/Desktop/OriginBi-Technical/frontend/components/student/dashboard/ActiveDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-white rounded-2xl border border-gray-200/g, 'bg-white dark:bg-[#111a15] rounded-2xl border border-gray-200 dark:border-white/10');
content = content.replace(/bg-white border border-gray-200/g, 'bg-white dark:bg-[#111a15] border border-gray-200 dark:border-white/10');
content = content.replace(/text-gray-900/g, 'text-gray-900 dark:text-white');
content = content.replace(/text-gray-800/g, 'text-gray-800 dark:text-slate-200');
content = content.replace(/text-gray-700/g, 'text-gray-700 dark:text-slate-300');
content = content.replace(/text-gray-600/g, 'text-gray-600 dark:text-slate-400');
content = content.replace(/text-gray-500/g, 'text-gray-500 dark:text-slate-500');
content = content.replace(/bg-gray-100/g, 'bg-gray-100 dark:bg-white/10');
content = content.replace(/bg-gray-50/g, 'bg-gray-50 dark:bg-white/5');
content = content.replace(/bg-gray-200/g, 'bg-gray-200 dark:bg-white/10');
content = content.replace(/bg-gray-300/g, 'bg-gray-300 dark:bg-slate-700');
content = content.replace(/border-gray-100/g, 'border-gray-100 dark:border-white/10');
content = content.replace(/border-gray-300/g, 'border-gray-300 dark:border-white/20');
content = content.replace(/stroke="#f3f4f6"/g, 'stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10"');

fs.writeFileSync(file, content);
console.log("Done replacing dark mode variants.");
