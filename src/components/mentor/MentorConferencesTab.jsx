import React, { useState, useEffect } from 'react';
import { getTraineeProfile } from '@/functions/getTraineeProfile';
import { Card } from '@/components/ui/card';
import StatusChip from '@/components/shared/StatusChip';
import { LogIn, LogOut, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

function ConferenceCard({ record, type, icon: Icon }) {
  const title = type === 'entrance' ? 'Entrance Conference' : 'Exit Conference';

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

      {record?.notes && (
        <p className="text-xs text-muted-foreground italic">{record.notes}</p>
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

export default function MentorConferencesTab({ traineeEmail, assignmentId, initialConferences }) {
  const [conferences, setConferences] = useState(initialConferences || []);
  const [loading, setLoading] = useState(!initialConferences);

  useEffect(() => {
    if (initialConferences) return;
    getTraineeProfile({ assignment_id: assignmentId }).then(res => {
      setConferences(res.data?.conferences || []);
      setLoading(false);
    });
  }, [assignmentId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const entrance = conferences.find(r => r.conference_type === 'entrance');
  const exit = conferences.find(r => r.conference_type === 'exit');

  return (
    <div className="space-y-4">
      <ConferenceCard record={entrance} type="entrance" icon={LogIn} />
      <ConferenceCard record={exit} type="exit" icon={LogOut} />
    </div>
  );
}