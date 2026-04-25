import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTraineeProfile } from '@/functions/getTraineeProfile';
import { saveConferenceRecord } from '@/functions/saveConferenceRecord';
import { saveMentorConferenceRatings } from '@/functions/saveMentorConferenceRatings';
import { queueWrite } from '@/lib/offlineDb';
import { getSession } from '@/lib/sqhnSession';
import { Card } from '@/components/ui/card';
import StatusChip from '@/components/shared/StatusChip';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { LogIn, LogOut, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ENTRANCE_AGENDA = [
  'Surveyor introductions and roles',
  'Purpose and scope of the survey',
  'Resident/patient rights and grievance process',
  'Survey methodology and schedule',
  'Medical records access procedures',
  'Staff availability and interviews',
  'Questions and facility concerns',
];

const EXIT_AGENDA = [
  'Summary of survey findings',
  'Deficiencies identified and regulatory citations',
  'Severity and scope determinations',
  'Plan of correction expectations',
  'Informal dispute resolution process',
  'Next steps and timelines',
  'Questions from facility leadership',
];

const RATINGS = [
  { value: 'satisfactory', label: 'Satisfactory', activeClass: 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-200' },
  { value: 'needs_improvement', label: 'Needs Improvement', activeClass: 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200' },
];

// Suggested comments indexed by [conference_type][item_index][rating]
const SUGGESTED_COMMENTS = {
  entrance: [
    {
      satisfactory: 'Trainee clearly introduced themselves and articulated their role. Facility staff appeared informed and at ease.',
      needs_improvement: 'Trainee did not clearly introduce themselves or articulate their surveyor role. Introductions were incomplete or unclear to facility staff.',
    },
    {
      satisfactory: "Trainee effectively communicated the survey's purpose and scope. Facility leadership had a clear understanding of what to expect.",
      needs_improvement: 'Trainee failed to clearly communicate the purpose and scope of the survey. Facility staff were left uncertain about what was being assessed.',
    },
    {
      satisfactory: 'Trainee adequately explained resident rights and the grievance process, covering key protections and how concerns can be raised.',
      needs_improvement: 'Trainee did not adequately explain resident rights or the grievance process. Key information was omitted or not clearly communicated.',
    },
    {
      satisfactory: 'Trainee clearly explained the survey methodology and provided a reasonable overview of the expected schedule.',
      needs_improvement: 'Trainee was unable to clearly explain the survey methodology or expected timeline, causing confusion among facility leadership.',
    },
    {
      satisfactory: 'Trainee clearly outlined the process for accessing medical records and established appropriate expectations with facility staff.',
      needs_improvement: 'Trainee did not clearly outline the process for accessing medical records or establish expectations with facility staff.',
    },
    {
      satisfactory: 'Trainee effectively communicated expectations for staff availability and the interview process to facility leadership.',
      needs_improvement: 'Trainee did not effectively communicate expectations for staff availability and interview scheduling during the survey.',
    },
    {
      satisfactory: 'Trainee managed facility questions and concerns professionally, providing clear and complete responses.',
      needs_improvement: 'Trainee did not effectively manage facility questions or concerns. Responses were incomplete or did not adequately address the issues raised.',
    },
  ],
  exit: [
    {
      satisfactory: 'Trainee provided a clear, organized summary of survey findings. Facility staff had a solid understanding of the overall results.',
      needs_improvement: 'Trainee did not provide a clear or organized summary of findings. Facility staff were left unclear about the overall survey results.',
    },
    {
      satisfactory: 'Trainee accurately presented identified deficiencies and corresponding regulatory citations with sufficient clarity.',
      needs_improvement: 'Trainee failed to accurately or clearly present the deficiencies and corresponding regulatory citations.',
    },
    {
      satisfactory: 'Trainee adequately explained severity and scope determinations and could respond to clarifying questions from facility leadership.',
      needs_improvement: 'Trainee was unable to adequately explain severity and scope determinations to facility leadership.',
    },
    {
      satisfactory: 'Trainee clearly communicated the expectations for the plan of correction, including format and submission timelines.',
      needs_improvement: 'Trainee did not clearly communicate the expectations for the plan of correction or the required format and timeline.',
    },
    {
      satisfactory: "Trainee adequately explained the informal dispute resolution process and the facility's rights regarding disputed findings.",
      needs_improvement: "Trainee did not adequately explain the IDR process or the facility's rights regarding disputed findings.",
    },
    {
      satisfactory: 'Trainee clearly communicated next steps and critical timelines following the survey conclusion.',
      needs_improvement: 'Trainee failed to clearly communicate next steps and critical timelines following the survey.',
    },
    {
      satisfactory: 'Trainee effectively and professionally managed questions from facility leadership, providing complete and accurate responses.',
      needs_improvement: 'Trainee did not effectively manage questions from facility leadership. Responses were incomplete or unclear.',
    },
  ],
};

function ConferenceCard({ record, type, agenda, onRatingChange, onCommentChange, onSave, isSaving, saveAttempted }) {
  const Icon = type === 'entrance' ? LogIn : LogOut;
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
        <StatusChip status={record?.status || 'not_started'} />
      </div>

      <div className="space-y-5">
        {agenda.map((item, idx) => {
          const currentRating = ratings[idx];
          const comment = comments[idx] || '';
          const isMissingComment = saveAttempted && ratings[idx] && !comment.trim();

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
              <div className="pl-7 space-y-1.5">
                <textarea
                  value={comment}
                  onChange={e => onCommentChange(type, idx, e.target.value)}
                  placeholder="Comment required..."
                  rows={2}
                  className={`w-full text-xs rounded-lg border px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none bg-transparent ${
                    isMissingComment ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'
                  }`}
                />
                {isMissingComment && (
                  <p className="text-[11px] text-destructive">Comment is required</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {record?.notes && (
        <p className="text-xs text-muted-foreground italic border-t border-border pt-3">{record.notes}</p>
      )}

      {record?.status === 'completed' && record.completed_at && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 border-t border-border pt-3">
          <Clock className="w-3 h-3" />
          Completed {format(new Date(record.completed_at), 'dd MMM yyyy, HH:mm')}
        </div>
      )}

      <div className="border-t border-border pt-3">
        <Button
          size="sm"
          className="w-full"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
          {isSaving ? 'Saving…' : 'Save Ratings & Comments'}
        </Button>
      </div>
    </Card>
  );
}

export default function MentorConferencesTab({ traineeEmail, assignmentId, initialConferences }) {
  const session = getSession();
  const { toast } = useToast();
  const [conferences, setConferences] = useState(initialConferences || []);
  const [loading, setLoading] = useState(!initialConferences);
  const [saving, setSaving] = useState({ entrance: false, exit: false });
  const [saveAttempted, setSaveAttempted] = useState({ entrance: false, exit: false });
  const commentDebounceRef = useRef({});

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
    if (!navigator.onLine) {
      queueWrite('saveConferenceRecord', payload).then(() => setSaving(prev => ({ ...prev, [type]: false })));
      return;
    }
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

      // Auto-populate comment with suggestion when a rating is selected and comment is empty
      const autoComment = (rec) => {
        const existingComment = rec?.item_comments?.[itemIndex] || '';
        if (!existingComment.trim()) {
          return SUGGESTED_COMMENTS[type]?.[itemIndex]?.[rating] || '';
        }
        return existingComment;
      };

      if (idx === -1) {
        const newRec = { conference_type: type, item_ratings: { [itemIndex]: rating }, item_comments: {}, status: 'in_progress' };
        const comment = autoComment(null);
        if (comment) newRec.item_comments[itemIndex] = comment;
        const next = [...updated, newRec];
        saveRecord(type, next);
        return next;
      }
      const rec = { ...updated[idx] };
      const currentRating = rec.item_ratings?.[itemIndex];
      rec.item_ratings = { ...(rec.item_ratings || {}) };
      if (currentRating === rating) {
        delete rec.item_ratings[itemIndex];
      } else {
        rec.item_ratings[itemIndex] = rating;
        const comment = autoComment(rec);
        if (comment) rec.item_comments = { ...(rec.item_comments || {}), [itemIndex]: comment };
      }
      updated[idx] = rec;
      saveRecord(type, updated);
      return updated;
    });
  }, [saveRecord]);

  const handleSave = useCallback(async (type, agenda) => {
    setSaveAttempted(prev => ({ ...prev, [type]: true }));

    const record = conferences.find(r => r.conference_type === type);
    const ratings = record?.item_ratings || {};
    const comments = record?.item_comments || {};

    // Require a comment for every rated item
    const missingComment = agenda.some((_, idx) => ratings[idx] && !(comments[idx] || '').trim());
    if (missingComment) {
      toast({ title: 'Comment required for all rated items', description: 'Please enter a comment for every rated agenda item before saving.', variant: 'destructive' });
      return;
    }

    const item_assessments = agenda.map((label, idx) => ({
      item_index: idx,
      item_label: label,
      rating: ratings[idx] || null,
      comment: comments[idx] || '',
    }));

    setSaving(prev => ({ ...prev, [type]: true }));
    const ratingsPayload = { assignment_id: assignmentId, conference_type: type, item_assessments };
    if (!navigator.onLine) {
      await queueWrite('saveMentorConferenceRatings', ratingsPayload);
      setSaving(prev => ({ ...prev, [type]: false }));
      setSaveAttempted(prev => ({ ...prev, [type]: false }));
      toast({ title: 'Saved offline', description: 'Will sync when reconnected.' });
      return;
    }
    await saveMentorConferenceRatings(ratingsPayload);
    setSaving(prev => ({ ...prev, [type]: false }));
    setSaveAttempted(prev => ({ ...prev, [type]: false }));
    toast({ title: 'Saved', description: `${type === 'entrance' ? 'Entrance' : 'Exit'} conference ratings saved.` });
  }, [conferences, assignmentId, toast]);

  const handleCommentChange = useCallback((type, itemIndex, comment) => {
    setConferences(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(r => r.conference_type === type);
      let next;
      if (idx === -1) {
        next = [...updated, { conference_type: type, item_ratings: {}, item_comments: { [itemIndex]: comment }, status: 'in_progress' }];
      } else {
        const rec = { ...updated[idx], item_comments: { ...(updated[idx].item_comments || {}), [itemIndex]: comment } };
        next = [...updated];
        next[idx] = rec;
      }
      // Debounce save: wait 800ms after last keystroke
      const key = `${type}-${itemIndex}`;
      clearTimeout(commentDebounceRef.current[key]);
      commentDebounceRef.current[key] = setTimeout(() => saveRecord(type, next), 800);
      return next;
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
        onSave={() => handleSave('entrance', ENTRANCE_AGENDA)}
        isSaving={saving.entrance}
        saveAttempted={saveAttempted.entrance}
      />
      <ConferenceCard
        record={exit}
        type="exit"
        agenda={EXIT_AGENDA}
        onRatingChange={handleRatingChange}
        onCommentChange={handleCommentChange}
        onSave={() => handleSave('exit', EXIT_AGENDA)}
        isSaving={saving.exit}
        saveAttempted={saveAttempted.exit}
      />
    </div>
  );
}