import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTraineeProfile } from '@/functions/getTraineeProfile';
import { saveConferenceRecord } from '@/functions/saveConferenceRecord';
import { saveMentorConferenceRatings } from '@/functions/saveMentorConferenceRatings';
import { getSession } from '@/lib/sqhnSession';
import { Card } from '@/components/ui/card';
import StatusChip from '@/components/shared/StatusChip';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { LogIn, LogOut, Clock, Loader2 } from 'lucide-react';
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

// Suggested comments indexed by [conference_type][item_index][rating]
const SUGGESTED_COMMENTS = {
  entrance: [
    {
      satisfactory: 'Introductions were made clearly and professionally to all facility leadership present.',
      needs_improvement: 'Introductions were incomplete or lacked clarity; some leadership members were not properly acknowledged.',
    },
    {
      satisfactory: 'Survey schedule was confirmed with management and all parties understood the plan.',
      needs_improvement: 'Schedule confirmation was unclear or not fully agreed upon with facility management.',
    },
    {
      satisfactory: 'Documentation request list was submitted promptly and completely.',
      needs_improvement: 'Documentation request list was delayed, incomplete, or not clearly communicated.',
    },
    {
      satisfactory: 'Survey objectives and process were explained thoroughly and the facility clearly understood expectations.',
      needs_improvement: 'Explanation of objectives was unclear or incomplete; facility had remaining questions.',
    },
    {
      satisfactory: 'Questions from leadership were addressed professionally and with confidence.',
      needs_improvement: 'Some questions were not answered adequately or the response lacked professionalism.',
    },
    {
      satisfactory: 'Conflict of interest was declared appropriately and documented.',
      needs_improvement: 'Conflict of interest declaration was omitted or not handled according to protocol.',
    },
    {
      satisfactory: 'Survey scope including services and conditional chapters was clearly confirmed.',
      needs_improvement: 'Survey scope was not fully clarified, leaving ambiguity about services or conditional chapters.',
    },
  ],
  exit: [
    {
      satisfactory: 'Preliminary findings were presented clearly and comprehensively to facility leadership.',
      needs_improvement: 'Findings presentation was incomplete or difficult for facility leadership to follow.',
    },
    {
      satisfactory: 'All critical findings were communicated clearly with appropriate emphasis.',
      needs_improvement: 'Critical findings were not communicated clearly or their severity was not adequately conveyed.',
    },
    {
      satisfactory: 'Context and rationale for scores were explained clearly and tied to evidence.',
      needs_improvement: 'Explanations for scores lacked sufficient context or were not well linked to observed evidence.',
    },
    {
      satisfactory: 'Recommendations and next steps were explained clearly and the facility knew how to proceed.',
      needs_improvement: 'Next steps were unclear or recommendations were not sufficiently actionable.',
    },
    {
      satisfactory: 'Facility questions were handled professionally and responses were appropriate and thorough.',
      needs_improvement: 'Questions were not fully addressed or responses were insufficient.',
    },
    {
      satisfactory: 'CAPA expectations were explained clearly for all identified findings.',
      needs_improvement: 'CAPA expectations were not fully communicated or lacked specificity for identified findings.',
    },
    {
      satisfactory: 'Professional composure was maintained throughout the exit conference.',
      needs_improvement: 'Composure was not consistently maintained; tone or responses could have been more professional.',
    },
  ],
};

function ConferenceCard({ record, type, agenda, onRatingChange, onCommentChange, onSave, isSaving, saveAttempted }) {
  const Icon = type === 'entrance' ? LogIn : LogOut;
  const title = type === 'entrance' ? 'Entrance Conference' : 'Exit Conference';
  const ratings = record?.item_ratings || {};
  const comments = record?.item_comments || {};
  const rated = agenda.filter((_, i) => ratings[i]).length;
  const suggestions = SUGGESTED_COMMENTS[type] || [];

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
          const itemSuggestions = suggestions[idx] || {};
          const suggestedText = currentRating ? itemSuggestions[currentRating] : null;
          const isMissingComment = saveAttempted && !comment.trim();

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
                {suggestedText && !comment.trim() && (
                  <button
                    onClick={() => onCommentChange(type, idx, suggestedText)}
                    className="w-full text-left text-xs text-primary/80 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors leading-relaxed"
                  >
                    <span className="font-medium text-primary/60 block mb-0.5 uppercase tracking-wide" style={{fontSize: '10px'}}>Suggested →</span>
                    {suggestedText}
                  </button>
                )}
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

  const handleSave = useCallback(async (type, agenda) => {
    setSaveAttempted(prev => ({ ...prev, [type]: true }));

    const record = conferences.find(r => r.conference_type === type);
    const ratings = record?.item_ratings || {};
    const comments = record?.item_comments || {};

    // Require a comment for every item
    const missingComment = agenda.some((_, idx) => !(comments[idx] || '').trim());
    if (missingComment) {
      toast({ title: 'Comments required', description: 'Please enter a comment for every agenda item before saving.', variant: 'destructive' });
      return;
    }

    const item_assessments = agenda.map((label, idx) => ({
      item_index: idx,
      item_label: label,
      rating: ratings[idx] || null,
      comment: comments[idx] || '',
    }));

    setSaving(prev => ({ ...prev, [type]: true }));
    await saveMentorConferenceRatings({ assignment_id: assignmentId, conference_type: type, item_assessments });
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