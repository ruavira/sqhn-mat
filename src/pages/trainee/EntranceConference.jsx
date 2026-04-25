import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getSession } from '@/lib/sqhnSession';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav';
import StatusChip from '@/components/shared/StatusChip';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const ENTRANCE_CHECKLIST = [
  { id: 1, text: 'Introduced the survey team to facility leadership' },
  { id: 2, text: 'Confirmed the survey schedule with facility management' },
  { id: 3, text: 'Submitted the documentation request list' },
  { id: 4, text: 'Explained the survey objectives and process clearly' },
  { id: 5, text: 'Addressed questions from facility leadership professionally' },
  { id: 6, text: 'Declared any conflict of interest' },
  { id: 7, text: 'Confirmed scope of survey (services and conditional chapters)' },
];

export default function EntranceConference() {
  const session = getSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState(ENTRANCE_CHECKLIST.map(i => ({ ...i, checked: false })));
  const [notes, setNotes] = useState('');
  const [existingId, setExistingId] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['entrance-conference', session?.email, session?.assignment_id],
    queryFn: () => base44.entities.ConferenceRecord.filter({
      trainee_email: session.email,
      assignment_id: session.assignment_id,
      conference_type: 'entrance',
    }),
    enabled: !!session?.email && !!session?.assignment_id,
  });

  useEffect(() => {
    if (records.length > 0) {
      const record = records[0];
      setExistingId(record.id);
      if (record.checklist_items?.length) {
        setChecklist(record.checklist_items);
      }
      setNotes(record.notes || '');
      setIsCompleted(record.status === 'completed');
      setCompletedAt(record.completed_at);
    }
  }, [records]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingId) {
        return base44.entities.ConferenceRecord.update(existingId, data);
      }
      const created = await base44.entities.ConferenceRecord.create(data);
      setExistingId(created.id);
      return created;
    },
  });

  const buildPayload = useCallback((overrides = {}) => ({
    trainee_email: session.email,
    assignment_id: session.assignment_id,
    conference_type: 'entrance',
    checklist_items: checklist,
    notes,
    status: isCompleted ? 'completed' : (checklist.some(i => i.checked) || notes ? 'in_progress' : 'not_started'),
    ...overrides,
  }), [checklist, notes, isCompleted, session]);

  // Auto-save on changes
  useEffect(() => {
    if (isLoading || isCompleted) return;
    const timer = setTimeout(() => {
      saveMutation.mutate(buildPayload());
    }, 1000);
    return () => clearTimeout(timer);
  }, [checklist, notes]);

  const handleToggle = (id) => {
    if (isCompleted) return;
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const handleComplete = () => {
    const payload = buildPayload({
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    saveMutation.mutate(payload);
    setIsCompleted(true);
    setCompletedAt(payload.completed_at);
    queryClient.invalidateQueries({ queryKey: ['entrance-conference'] });
    toast({ title: 'Entrance Conference', description: 'Marked as complete.' });
  };

  const checkedCount = checklist.filter(i => i.checked).length;

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
        {/* Status */}
        <div className="flex items-center justify-between">
          <StatusChip status={isCompleted ? 'completed' : (checklist.some(i => i.checked) || notes ? 'in_progress' : 'not_started')} />
          {isCompleted && completedAt && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {format(new Date(completedAt), 'dd MMM, HH:mm')}
            </div>
          )}
        </div>

        {/* Checklist */}
        <Card className="p-4 space-y-4">
          {checklist.map(item => (
            <label
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                item.checked ? 'bg-green-50' : 'bg-muted/50'
              } ${isCompleted ? 'cursor-default' : ''}`}
            >
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => handleToggle(item.id)}
                disabled={isCompleted}
                className="mt-0.5 h-5 w-5"
              />
              <span className={`text-sm leading-relaxed ${item.checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.text}
              </span>
            </label>
          ))}
        </Card>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Conference Notes
          </label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Conference notes..."
            className="min-h-[100px]"
            disabled={isCompleted}
          />
        </div>

        {/* Complete Button */}
        {!isCompleted && (
          <Button
            onClick={handleComplete}
            disabled={checkedCount < 4}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            Mark as Complete ({checkedCount}/7 checked)
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}