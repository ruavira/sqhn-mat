import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import StatusChip from '@/components/shared/StatusChip';
import { LogIn, LogOut, Check, X, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

function ConferenceCard({ record, type, icon: Icon }) {
  const title = type === 'entrance' ? 'Entrance Conference' : 'Exit Conference';
  const checklist = record?.checklist_items || [];
  const checkedCount = checklist.filter(i => i.checked).length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <StatusChip status={record?.status || 'not_started'} />
      </div>

      {record && checklist.length > 0 && (
        <div className="space-y-1.5">
          {checklist.map(item => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              {item.checked ? (
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
              )}
              <span className={item.checked ? 'text-foreground' : 'text-muted-foreground'}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {record?.status === 'completed' && record.completed_at && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 pt-1 border-t border-border">
          <Clock className="w-3 h-3" />
          Completed {format(new Date(record.completed_at), 'dd MMM yyyy, HH:mm')}
        </div>
      )}
    </Card>
  );
}

export default function MentorConferencesTab({ traineeEmail, assignmentId }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['conferences', traineeEmail, assignmentId],
    queryFn: () => base44.entities.ConferenceRecord.filter({
      trainee_email: traineeEmail,
      assignment_id: assignmentId,
    }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const entrance = records.find(r => r.conference_type === 'entrance');
  const exit = records.find(r => r.conference_type === 'exit');

  return (
    <div className="space-y-4">
      <ConferenceCard record={entrance} type="entrance" icon={LogIn} />
      <ConferenceCard record={exit} type="exit" icon={LogOut} />
    </div>
  );
}