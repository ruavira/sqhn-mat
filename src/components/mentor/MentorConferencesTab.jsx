import React, { useState, useEffect, useCallback } from 'react';
import { getTraineeProfile } from '@/functions/getTraineeProfile';
import { saveConferenceRecord } from '@/functions/saveConferenceRecord';
import { getSession } from '@/lib/sqhnSession';
import { Card } from '@/components/ui/card';
import StatusChip from '@/components/shared/StatusChip';
import { LogIn, LogOut, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const ENTRANCE_AGENDA = [
  'Introduce the survey team to facility leadership',
  'Confirm the survey schedule with facility management',
  'Submit the documentation request list',
  'Explain the survey objectives and process clearly',
  'Address questions from facility leadership professionally',
  'Declare any conflict of interest',
  'Confirm scope of survey (services and conditional chapters)',
];

const EXIT_AGENDA = [
  'Present preliminary findings to facility leadership',
  'Communicate all critical findings clearly',
  'Provide context and explanation for scores given',
  'Explain recommendations and next steps',
  'Allow facility to ask questions and respond appropriately',
  'Discuss CAPA expectations for identified findings',
  'Maintain professional composure throughout',
];

const RATINGS = [
  { value: 'satisfactory', label: 'Satisfactory', activeClass: 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-200' },
  { value: 'needs_improvement', label: 'Needs Improvement', activeClass: 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200' },
];

function ConferenceCard({ record, type, agenda, onRatingChange, onCommentChange, saving }) {
  const icon = type === 'entrance' ? LogIn : LogOut;
  const Icon = icon;
  const title = type === 'entrance' ? 'Entrance Conference' : 'Exit Conference';
  const ratings = record?.item_ratings || {};
  const comments = record?.item_comments || {};

  const rated = agenda.filter((_, i) => ratings[i]).length;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{rated}/{agenda.length} rated</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <StatusChip status={record?.status || 'not_started'} />
        </div>
      </div>

      <div className="space-y-3">
        {agenda.map((item, idx) => {
          const currentRating = ratings[idx];
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-sm text-foreground leading-relaxed">{item}</span>
              </div>
              <div className="flex gap-2 pl-7">
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => onRatingChange(type, idx, r.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      currentRating === r.value
                        ? r.activeClass
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="pl-7">
                <textarea
                  value={comments[idx] || ''}
                  onChange={e => onCommentChange(type, idx, e.target.value)}
                  placeholder="Comment (optional)..."
                  rows={1}
                  className="w-full text-xs rounded-lg border border-input bg-transparent px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      {record?.notes && (
        <p className="text-xs text-muted-foreground italic border-t border-border pt-3">{record.notes}</p>
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
  const session = getSession();
  const [conferences, setConferences] = useState(initialConferences || []);
  const [loading, setLoading] = useState(!initialConferences);
  const [saving, setSaving] = useState({ entrance: false, exit: false });

  useEffect(() => {
    if (initialConferences) return;
    getTraineeProfile({ assignment_id: assignmentId }).then(res => {
      setConferences(res.data?.conferences || []);
      setLoading(false);
    });
  }, [assignmentId]);

  const saveRecord = useCallback((type, updatedConferences) => {
    const record = updatedConferences.find(r => r.conference_type === type);
    const payload = {
      trainee_email: traineeEmail,
      assignment_id: assignmentId,
      conference_type: type,
      item_ratings: record?.item_ratings || {},
      item_comments: record?.item_comments || {},
      notes: record?.notes || '',
      status: record?.status || 'in_progress',
      record_id: record?.id || null,
    };
    setSaving(prev => ({ ...prev, [type]: true }));
    saveConferenceRecord(payload).then(res => {
      const saved = res.data?.record;
      if (saved?.id) {
        setConferences(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(r => r.conference_type === type);
          if (idx === -1) updated.push(saved);
          else updated[idx] = { ...updated[idx], id: saved.id };
          return updated;
        });
      }
      setSaving(prev => ({ ...prev, [type]: false }));
    });
  }, [traineeEmail, assignmentId]);

  const handleRatingChange = useCallback((type, itemIndex, rating) => {
    setConferences(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(r => r.conference_type === type);
      if (idx === -1) {
        const next = [...updated, { conference_type: type, item_ratings: { [itemIndex]: rating }, item_comments: {}, status: 'in_progress' }];
        saveRecord(type, next);
        return next;
      }
      const rec = { ...updated[idx] };
      const currentRating = rec.item_ratings?.[itemIndex];
      rec.item_ratings = { ...(rec.item_ratings || {}) };
      if (currentRating === rating) delete rec.item_ratings[itemIndex];
      else rec.item_ratings[itemIndex] = rating;
      updated[idx] = rec;
      saveRecord(type, updated);
      return updated;
    });
  }, [saveRecord]);

  const handleCommentChange = useCallback((type, itemIndex, comment) => {
    setConferences(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(r => r.conference_type === type);
      if (idx === -1) {
        const next = [...updated, { conference_type: type, item_ratings: {}, item_comments: { [itemIndex]: comment }, status: 'in_progress' }];
        saveRecord(type, next);
        return next;
      }
      const rec = { ...updated[idx], item_comments: { ...(updated[idx].item_comments || {}), [itemIndex]: comment } };
      updated[idx] = rec;
      saveRecord(type, updated);
      return updated;
    });
  }, [saveRecord]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const entrance = conferences.find(r => r.conference_type === 'entrance');
  const exit = conferences.find(r => r.conference_type === 'exit');

  return (
    <div className="space-y-4">
      <ConferenceCard
        record={entrance}
        type="entrance"
        agenda={ENTRANCE_AGENDA}
        onRatingChange={handleRatingChange}
        onCommentChange={handleCommentChange}
        saving={saving.entrance}
      />
      <ConferenceCard
        record={exit}
        type="exit"
        agenda={EXIT_AGENDA}
        onRatingChange={handleRatingChange}
        onCommentChange={handleCommentChange}
        saving={saving.exit}
      />
    </div>
  );
}