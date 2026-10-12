export function buildMetricCard({ title, value, tone = 'neutral', meta = '' }) {
  const toneClasses = {
    neutral: 'bg-gray-800 border-gray-700 text-white',
    positive: 'bg-green-900/20 border-green-700/50 text-green-400',
    negative: 'bg-red-900/20 border-red-700/50 text-red-400',
    warn: 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400',
  };

  return {
    title,
    value,
    meta,
    toneClass: toneClasses[tone] || toneClasses.neutral,
  };
}
