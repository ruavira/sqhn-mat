import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTraineeProfile } from '@/functions/getTraineeProfile';
import { saveConferenceRecord } from '@/functions/saveConferenceRecord';
import { getSession } from '@/lib/sqhnSession';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav';
import StatusChip from '@/components/shared/StatusChip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { queueWrite } from '@/lib/offlineDb';

const ENTRANCE_AGENDA = [
  'Introduce the survey team to facility leadership',
  'Confirm the survey schedule with facility management',
  'Submit the documentation request list',
  'Explain the survey objectives and process clearly',
  'Address questions from facility leadership professionally',
  'Declare any conflict of interest',
  'Confirm scope of survey (services and conditional chapters)',
];

export default function EntranceConference() {
  const session = getSession();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [existingId, setExistingId] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.assignment_id) return;
    getTraineeProfile({ assignment_id: session.assignment_id }).then(res => {
      const conferences = res.data?.conferences || [];
      const record = conferences.find(c => c.conference_type === 'entrance');
      if (record) {
        setExistingId(record.id);
        setNotes(record.notes || '');
        setIsCompleted(record.status === 'completed');
        setCompletedAt(record.completed_at);
      }
      setIsLoading(false);
    });
  }, [session?.assignment_id]);

  const buildPayload = useCallback((overrides = {}) => ({
    trainee_email: session.email,
    assignment_id: session.assignment_id,
    conference_type: 'entrance',
    notes,
    status: isCompleted ? 'completed' : (notes ? 'in_progress' : 'not_started'),
    record_id: existingId || null,
    ...overrides,
  }), [notes, isCompleted, session, existingId]);

  useEffect(() => {
    if (isLoading || isCompleted) return;
    const timer = setTimeout(async () => {
      const payload = buildPayload();
      if (!navigator.onLine) {
        await queueWrite('saveConferenceRecord', payload);
        return;
      }
      const res = await saveConferenceRecord(payload);
      const saved = res.data?.record;
      if (saved?.id && !existingId) setExistingId(saved.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes]);

  const handleComplete = async () => {
    const payload = buildPayload({
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    if (!navigator.onLine) {
      await queueWrite('saveConferenceRecord', payload);
      setIsCompleted(true);
      setCompletedAt(payload.completed_at);
      toast({ title: 'Entrance Conference', description: 'Saved offline — will sync when reconnected.' });
      return;
    }
    const res = await saveConferenceRecord(payload);
    const saved = res.data?.record;
    if (saved?.id && !existingId) setExistingId(saved.id);
    setIsCompleted(true);
    setCompletedAt(payload.completed_at);
    toast({ title: 'Entrance Conference', description: 'Marked as complete.' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Entrance Conference" />
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <StatusChip status={isCompleted ? 'completed' : (notes ? 'in_progress' : 'not_started')} />
          {isCompleted && completedAt && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {format(new Date(completedAt), 'dd MMM, HH:mm')}
            </div>
          )}
        </div>

        <Card className="p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Agenda</p>
          <ol className="space-y-3">
            {ENTRANCE_AGENDA.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-sm text-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conference Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Conference notes..." className="min-h-[100px]" disabled={isCompleted} />
        </div>

        {!isCompleted && (
          <Button onClick={handleComplete} className="w-full h-12 rounded-xl text-base font-semibold">
            Mark Conference as Complete
          </Button>
        )}
        {isCompleted && (
          <div className="flex items-center justify-center gap-2 py-3 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Conference completed</span>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}