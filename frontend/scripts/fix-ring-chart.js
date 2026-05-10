const fs = require('fs');
const file = 'c:/Users/Jaya Krishna/Desktop/OriginBi-Technical/frontend/components/student/dashboard/ActiveDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldRingChart = `const RingChart: React.FC<{ results: Record<string, AssessmentResult> }> = ({ results }) => {
  const metrics = [
    { r: 70, score: results.aptitude?.overallScore || 0, color: "#10b981" },
    { r: 56, score: results.communication?.overallScore || 0, color: "#06b6d4" },
    { r: 42, score: results.coding?.overallScore || 0, color: "#f59e0b" },
  ].filter(m => m.score > 0);
  const avg = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
    : 0;`;

const newRingChart = `const RingChart: React.FC<{ results: Record<string, AssessmentResult> }> = ({ results }) => {
  const dims = [
    { key: "aptitude", label: "Aptitude", color: "#10b981" },
    { key: "communication", label: "Communication", color: "#06b6d4" },
    { key: "coding", label: "Coding", color: "#f59e0b" },
    { key: "mnc", label: "MNC Career", color: "#6366f1" },
    { key: "role", label: "Role Based", color: "#84cc16" },
  ];
  const completedDims = dims.filter(d => results[d.key]?.overallScore);

  const metrics = completedDims.map((dim, i) => ({
    r: 70 - (i * 14),
    score: results[dim.key].overallScore,
    color: dim.color
  }));

  const avg = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
    : 0;`;

content = content.replace(oldRingChart, newRingChart);

const oldCircles = `<circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />
                  <circle cx="80" cy="80" r="56" fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />
                  <circle cx="80" cy="80" r="42" fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />`;

const newCircles = `{Object.keys(results).filter(k => results[k]?.overallScore).map((_, i) => (
                    <circle key={i} cx="80" cy="80" r={70 - (i * 14)} fill="none" stroke="currentColor" className="text-[#f3f4f6] dark:text-white/10" strokeWidth="6" />
                  ))}`;

content = content.replace(oldCircles, newCircles);

fs.writeFileSync(file, content);
console.log("Done updating RingChart for dynamic dims");
