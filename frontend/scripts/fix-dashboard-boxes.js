const fs = require('fs');

function fixBoxColors(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Replace big cards
    content = content.replace(/bg-white dark:bg-\[#111a15\]/g, 'bg-white/80 dark:bg-white/[0.08] backdrop-blur-xl');
    
    // Replace borders
    content = content.replace(/border border-gray-200 dark:border-white\/10/g, 'border border-gray-200 dark:border-white/[0.08]');
    content = content.replace(/border-gray-200 dark:border-white\/10/g, 'border-gray-200 dark:border-white/[0.08]');

    fs.writeFileSync(file, content);
}

fixBoxColors('c:/Users/Jaya Krishna/Desktop/OriginBi-Technical/frontend/components/student/dashboard/ActiveDashboard.tsx');
fixBoxColors('c:/Users/Jaya Krishna/Desktop/OriginBi-Technical/frontend/components/student/dashboard/EmptyStateDashboard.tsx');

console.log("Updated box colors to match Explore tab.");
