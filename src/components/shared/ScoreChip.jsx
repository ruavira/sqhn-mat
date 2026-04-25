import React from 'react';

const scoreConfig = {
  'Fully Met': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  'Partially Met': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'Not Met': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  'N/A': { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
};

export default function ScoreChip({ score, selected, onClick, size = 'md' }) {
  const config = scoreConfig[score] || { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200' };
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1.5';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${sizeClasses} rounded-lg font-medium border transition-all duration-200
        ${selected
          ? `${config.bg} ${config.text} ${config.border} ring-2 ring-offset-1 ring-current/20 shadow-sm`
          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }
      `}
    >
      {score}
    </button>
  );
}