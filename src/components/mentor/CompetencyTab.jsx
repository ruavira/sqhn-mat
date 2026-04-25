import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveCompetencyAssessment } from '@/functions/saveCompetencyAssessment';
import { getSession } from '@/lib/sqhnSession';
import { SQHN_DOMAINS, NEEDS_DEVELOPMENT_COMMENTS } from '@/lib/competencyData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CompetencyTab({ traineeEmail, assignmentId, assignmentData, initialCompetency }) {
  const session = getSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDomain, setCurrentDomain] = useState(0);
  const [domainScores, setDomainScores] = useState({});
  const [overallOutcome, setOverallOutcome] = useState('');
  const [overallComments, setOverallComments] = useState('');
  const [feedbackForTrainee, setFeedbackForTrainee] = useState('');
  const [mentorSignature, setMentorSignature] = useState('');
  const [existingId, setExistingId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialCompetency) {
      setExistingId(initialCompetency.id);
      setDomainScores(initialCompetency.domain_scores || {});
      setOverallOutcome(initialCompetency.overall_outcome || '');
      setOverallComments(initialCompetency.overall_comments || '');
      setFeedbackForTrainee(initialCompetency.feedback_for_trainee || '');
      setMentorSignature(initialCompetency.mentor_signature || '');
      setIsSubmitted(initialCompetency.status === 'submitted');
    }
  }, [initialCompetency]);

  const autoSave = useCallback(async () => {
    if (isSubmitted) return;
    const payload = {
      mentor_email: session.email,
      trainee_email: traineeEmail,
      assignment_id: assignmentId,
      domain_scores: domainScores,
      overall_outcome: overallOutcome,
      overall_comments: overallComments,
      feedback_for_trainee: feedbackForTrainee,
      mentor_signature: mentorSignature,
      status: 'draft',
      assessment_id: existingId || null,
    };
    const res = await saveCompetencyAssessment(payload);
    const saved = res.data?.record;
    if (saved?.id && !existingId) setExistingId(saved.id);
  }, [domainScores, overallOutcome, overallComments, feedbackForTrainee, mentorSignature, isSubmitted, existingId]);

  useEffect(() => {
    if (isSubmitted) return;
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [domainScores, overallOutcome, overallComments, feedbackForTrainee, mentorSignature]);

  const handleIndicatorToggle = (indicatorId, result) => {
    const updated = { ...domainScores };
    const current = updated[indicatorId]?.result;
    if (current === result) {
      delete updated[indicatorId];
    } else {
      updated[indicatorId] = {
        result,
        comment: result === 'needs_development'
          ? (updated[indicatorId]?.comment || NEEDS_DEVELOPMENT_COMMENTS[indicatorId] || '')
          : (updated[indicatorId]?.comment || ''),
      };
    }
    setDomainScores(updated);
  };

  const handleCommentChange = (indicatorId, comment) => {
    setDomainScores(prev => ({ ...prev, [indicatorId]: { ...prev[indicatorId], comment } }));
  };

  const handleSubmit = async () => {
    if (!overallOutcome || !mentorSignature) {
      toast({ title: 'Missing fields', description: 'Please select an outcome and provide your signature.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      mentor_email: session.email,
      trainee_email: traineeEmail,
      assignment_id: assignmentId,
      domain_scores: domainScores,
      overall_outcome: overallOutcome,
      overall_comments: overallComments,
      feedback_for_trainee: feedbackForTrainee,
      mentor_signature: mentorSignature,
      signed_at: new Date().toISOString(),
      status: 'submitted',
      assessment_id: existingId || null,
      update_assignment: true,
    };
    await saveCompetencyAssessment(payload);
    setIsSubmitted(true);
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['mentor-assignments'] });
    toast({ title: 'Assessment submitted', description: 'Competency assessment has been submitted successfully.' });
  };

  const totalIndicators = SQHN_DOMAINS.reduce((sum, d) => sum + d.indicators.length, 0);
  const assessedIndicators = Object.keys(domainScores).length;
  const overallProgress = totalIndicators > 0 ? (assessedIndicators / totalIndicators) * 100 : 0;

  const domain = SQHN_DOMAINS[currentDomain];
  const showSummary = currentDomain >= SQHN_DOMAINS.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{assessedIndicators} of {totalIndicators} indicators assessed</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentDomain(prev => Math.max(0, prev - 1))} disabled={currentDomain === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-semibold text-muted-foreground">
          {showSummary ? 'Summary & Submission' : `Domain ${domain.id} of ${SQHN_DOMAINS.length}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDomain(prev => Math.min(SQHN_DOMAINS.length, prev + 1))} disabled={showSummary}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isSubmitted && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Assessment Submitted</span>
          </div>
          <p className="text-xs text-green-600 mt-1">Outcome: {overallOutcome}</p>
        </Card>
      )}

      {showSummary ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Outcome *</label>
              <Select value={overallOutcome} onValueChange={setOverallOutcome} disabled={isSubmitted}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recommended for Certification">Recommended for Certification</SelectItem>
                  <SelectItem value="Recommended for Mentored Assessment 2">Recommended for Mentored Assessment 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Comments</label>
              <Textarea value={overallComments} onChange={e => setOverallComments(e.target.value)} placeholder="Overall assessment comments..." className="min-h-[80px]" disabled={isSubmitted} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback for Trainee</label>
              <Textarea value={feedbackForTrainee} onChange={e => setFeedbackForTrainee(e.target.value)} placeholder="Feedback that will be shared with the trainee..." className="min-h-[80px]" disabled={isSubmitted} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mentor Signature *</label>
              <Input value={mentorSignature} onChange={e => setMentorSignature(e.target.value)} placeholder="Type your full name as signature" className="h-12" disabled={isSubmitted} />
            </div>
          </Card>
          {!isSubmitted && (
            <Button onClick={handleSubmit} disabled={saving} className="w-full h-12 rounded-xl text-base font-semibold">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Assessment'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-foreground">{domain.title}</h3>
          {domain.indicators.map(indicator => {
            const score = domainScores[indicator.id];
            return (
              <Card key={indicator.id} className="p-3 space-y-2">
                <p className="text-sm text-foreground">
                  <span className="font-mono text-xs text-muted-foreground mr-1.5">{indicator.id}</span>
                  {indicator.text}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleIndicatorToggle(indicator.id, 'pass')}
                    disabled={isSubmitted}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      score?.result === 'pass' ? 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >Pass</button>
                  <button
                    type="button"
                    onClick={() => handleIndicatorToggle(indicator.id, 'needs_development')}
                    disabled={isSubmitted}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      score?.result === 'needs_development' ? 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >Needs Development</button>
                </div>
                {score?.result === 'needs_development' && (
                  <Textarea value={score.comment || ''} onChange={e => handleCommentChange(indicator.id, e.target.value)} placeholder="Comment..." className="text-xs min-h-[60px]" disabled={isSubmitted} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}