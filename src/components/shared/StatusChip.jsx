import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-700 border-green-200' },
  not_started: { label: 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function StatusChip({ status }) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <Badge variant="outline" className={`${config.className} font-medium text-xs px-2.5 py-0.5`}>
      {config.label}
    </Badge>
  );
}