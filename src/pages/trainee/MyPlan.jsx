import React, { useState, useEffect } from 'react';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav.jsx';
import { getTrainingPlan } from '@/functions/getTrainingPlan';
import { getRemedialPlan } from '@/functions/getRemedialPlan';
import { updateTraineeProgress } from '@/functions/updateTraineeProgress';
import { acknowledgeRemedialPlan } from '@/functions/acknowledgeRemedialPlan';
import { getSession } from '@/lib/sqhnSession';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

const CATEGORY_COLORS = {
  Standards: 'bg-blue-100 text-blue-700 border-blue-200',
  'Conference Skills': 'bg-purple-100 text-purple-700 border-purple-200',
  Competency: 'bg-teal-100 text-teal-700 border-teal-200',
  Custom: 'bg-slate-100 text-slate-600 border-slate-200',
};

function Badge({ label, colorClass }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
      {label}
    </span>
  );
}

const ISSUER_LABEL = 'SQHN Accreditation Unit — Surveyor Training Certification Program';

function IssuerLabel() {
  return (
    <p className="text-[10px] text-muted-foreground italic">
      Issued by: {ISSUER_LABEL}
    </p>
  );
}

function PlanItemCard({ item, onSave }) {
  const [status, setStatus] = useState(item.status || 'Pending');
  const [notes, setNotes] = useState(item.trainee_progress_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.id, status, notes);
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        <Badge label={item.category} colorClass={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Custom} />
        <Badge label={item.priority} colorClass={PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium} />
      </div>
      <p className="text-sm font-semibold leading-snug">{item.title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
      {item.due_date && (
        <p className="text-xs text-muted-foreground">Due: {item.due_date}</p>
      )}
      <div className="space-y-2 pt-1 border-t border-border">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">My Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="text-xs border border-input rounded-lg px-3 py-1.5 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring w-full"
          >
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Progress notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full text-xs border border-input rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Add your progress notes here..."
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          {saving ? 'Saving…' : 'Save Progress'}
        </Button>
      </div>
      <IssuerLabel />
    </div>
  );
}

function RemedialPlanCard({ plan, onAcknowledge }) {
  const [acknowledging, setAcknowledging] = useState(false);

  const handleAck = async () => {
    setAcknowledging(true);
    await onAcknowledge(plan.id);
    setAcknowledging(false);
  };

  return (
    <div className="bg-white rounded-xl border border-destructive/30 p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-destructive">Remedial Development Plan</span>
          <Badge
            label={plan.status}
            colorClass={plan.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          />
        </div>
        <p className="text-[10px] text-muted-foreground italic">Issued by: {ISSUER_LABEL}</p>
      </div>

      {plan.session_number && (
        <p className="text-xs text-muted-foreground">Related to Session {plan.session_number}</p>
      )}

      {(plan.identified_deficiencies || []).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Identified Areas for Development</p>
          <ul className="space-y-1">
            {plan.identified_deficiencies.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive/60 flex-shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(plan.corrective_actions || []).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Corrective Actions</p>
          <div className="space-y-2">
            {plan.corrective_actions.map((ca, i) => (
              <div key={i} className="bg-muted/40 rounded-lg px-3 py-2 space-y-1">
                <p className="text-xs">{ca.action}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {ca.target_date && <span className="text-[10px] text-muted-foreground">Target: {ca.target_date}</span>}
                  <Badge
                    label={ca.status}
                    colorClass={
                      ca.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                      ca.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.reassessment_date && (
        <p className="text-xs text-muted-foreground">Reassessment planned: <span className="font-medium text-foreground">{plan.reassessment_date}</span></p>
      )}

      {plan.mentor_notes && (
        <div className="bg-muted/40 rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Programme Notes</p>
          <p className="text-xs">{plan.mentor_notes}</p>
        </div>
      )}

      {plan.trainee_acknowledged ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle className="w-3.5 h-3.5" />
          Acknowledged on {format(new Date(plan.trainee_acknowledgment_date), 'dd MMM yyyy')}
        </div>
      ) : (
        <Button className="w-full text-left leading-snug h-auto py-2.5 px-4 whitespace-normal" onClick={handleAck} disabled={acknowledging}>
          {acknowledging ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 flex-shrink-0" /> : null}
          I acknowledge receipt of this development plan from the SQHN Accreditation Unit Surveyor Training Certification Program
        </Button>
      )}
    </div>
  );
}

export default function MyPlan() {
  const { toast } = useToast();
  const session = getSession();
  const assignmentId = session?.assignment_id;

  const [items, setItems] = useState([]);
  const [remedialPlan, setRemedialPlan] = useState(null);
  const [competencySubmitted, setCompetencySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!assignmentId) { setLoading(false); return; }
    Promise.all([
      getTrainingPlan({ assignment_id: assignmentId }),
      getRemedialPlan({ assignment_id: assignmentId }),
    ]).then(([planRes, remRes]) => {
      const allItems = planRes.data?.items || [];
      setItems(allItems.filter(i => i.visible_to_trainee));
      const plan = remRes.data?.plan;
      if (plan && (plan.status === 'Active' || plan.status === 'Completed')) {
        setRemedialPlan(plan);
        // If remedial plan exists and is active, competency was submitted
        setCompetencySubmitted(true);
      }
    }).catch(() => {}).finally(() => setLoading(false));

    // Check competency status via getFullAssessmentData would be heavy;
    // instead check if assignment has a result set
    const sess = getSession();
    if (sess?.result) setCompetencySubmitted(true);
  }, [assignmentId]);

  const handleSaveProgress = async (itemId, status, notes) => {
    await updateTraineeProgress({ item_id: itemId, status, trainee_progress_notes: notes });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status, trainee_progress_notes: notes } : i));
    toast({ title: 'Progress saved' });
  };

  const handleAcknowledge = async (planId) => {
    const res = await acknowledgeRemedialPlan({ plan_id: planId });
    setRemedialPlan(res.data?.plan || { ...remedialPlan, trainee_acknowledged: true, trainee_acknowledgment_date: new Date().toISOString() });
    toast({ title: 'Plan acknowledged', description: 'Your acknowledgment has been recorded.' });
  };

  const activeItems = items.filter(i => i.status !== 'Completed');
  const completedItems = items.filter(i => i.status === 'Completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="My Plan" />
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Assessment Report download */}
        {competencySubmitted && assignmentId && (
          <button
            onClick={() => window.open(`/report/${assignmentId}?type=trainee`, '_blank')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 px-4 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            SQHN Assessment Report — Trainee Copy
          </button>
        )}

        {/* Training plan */}
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Your Development Plan</h2>
            <p className="text-[10px] text-muted-foreground italic mt-0.5">Issued by: {ISSUER_LABEL}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} · {activeItems.length} active · {completedItems.length} completed
            </p>
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No plan items have been issued yet. Check back after your assessment sessions.</p>
            </div>
          ) : (
            <>
              {activeItems.map(item => (
                <PlanItemCard key={item.id} item={item} onSave={handleSaveProgress} />
              ))}

              {completedItems.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCompleted(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Completed ({completedItems.length})
                  </button>
                  {showCompleted && completedItems.map(item => (
                    <PlanItemCard key={item.id} item={item} onSave={handleSaveProgress} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Remedial plan */}
        {remedialPlan && (
          <div className="space-y-2">
            <RemedialPlanCard plan={remedialPlan} onAcknowledge={handleAcknowledge} />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}