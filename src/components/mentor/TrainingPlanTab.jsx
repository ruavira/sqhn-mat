import React, { useState, useEffect, useCallback } from 'react';
import { generateTrainingPlanSuggestions } from '@/functions/generateTrainingPlanSuggestions';
import { saveTrainingPlanItems } from '@/functions/saveTrainingPlanItems';
import { approveTrainingPlanItems } from '@/functions/approveTrainingPlanItems';
import { getTrainingPlan } from '@/functions/getTrainingPlan';
import { updateTrainingPlanItem } from '@/functions/updateTrainingPlanItem';
import { getRemedialPlan } from '@/functions/getRemedialPlan';
import { updateRemedialPlan } from '@/functions/updateRemedialPlan';
import { activateRemedialPlan } from '@/functions/activateRemedialPlan';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Sparkles, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  Standards: 'bg-blue-100 text-blue-700 border-blue-200',
  'Conference Skills': 'bg-purple-100 text-purple-700 border-purple-200',
  Competency: 'bg-teal-100 text-teal-700 border-teal-200',
  Custom: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

function Badge({ label, colorClass }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
      {label}
    </span>
  );
}

function StagedItem({ item, onChange, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <Badge label={item.category} colorClass={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Custom} />
          <Badge label={item.priority} colorClass={PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium} />
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <input
        value={item.title}
        onChange={e => onChange({ ...item, title: e.target.value })}
        className="w-full text-sm font-semibold border-b border-dashed border-border bg-transparent focus:outline-none focus:border-primary py-0.5"
        placeholder="Item title"
      />
      <textarea
        value={item.description}
        onChange={e => onChange({ ...item, description: e.target.value })}
        rows={3}
        className="w-full text-xs text-muted-foreground border border-input rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        placeholder="Description..."
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Due date:</label>
        <input
          type="date"
          value={item.due_date || ''}
          onChange={e => onChange({ ...item, due_date: e.target.value })}
          className="text-xs border border-input rounded-lg px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

function PlanItemCard({ item, onApprove }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          <Badge label={item.category} colorClass={CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Custom} />
          <Badge label={item.priority} colorClass={PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium} />
          {!item.visible_to_trainee && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
              Not sent
            </span>
          )}
        </div>
        {!item.visible_to_trainee && onApprove && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-2.5" onClick={() => onApprove(item.id)}>
            Approve
          </Button>
        )}
      </div>
      <p className="text-sm font-semibold">{item.title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
      {item.source_reference && (
        <p className="text-[10px] text-muted-foreground">Ref: {item.source_reference}</p>
      )}
      {item.due_date && (
        <p className="text-xs text-muted-foreground">Due: {item.due_date}</p>
      )}
      {item.trainee_progress_notes && (
        <div className="bg-muted/50 rounded-lg px-3 py-2 mt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Trainee notes</p>
          <p className="text-xs">{item.trainee_progress_notes}</p>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          item.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
          item.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
          'bg-slate-100 text-slate-500 border-slate-200'
        }`}>{item.status}</span>
      </div>
    </div>
  );
}

function RemedialPlanSection({ plan, onPlanChange }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => { setLocalPlan(plan); }, [plan]);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateRemedialPlan({ plan_id: localPlan.id, changes: {
      identified_deficiencies: localPlan.identified_deficiencies,
      corrective_actions: localPlan.corrective_actions,
      reassessment_date: localPlan.reassessment_date,
      mentor_notes: localPlan.mentor_notes,
    }});
    onPlanChange(res.data?.plan || localPlan);
    setSaving(false);
    toast({ title: 'Remedial plan saved' });
  };

  const handleActivate = async () => {
    setActivating(true);
    const res = await activateRemedialPlan({ plan_id: localPlan.id });
    onPlanChange(res.data?.plan || { ...localPlan, status: 'Active' });
    setActivating(false);
    toast({ title: 'Remedial plan activated', description: 'Trainee can now view the plan.' });
  };

  const statusColor = localPlan.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200'
    : localPlan.status === 'Completed' ? 'bg-blue-100 text-blue-700 border-blue-200'
    : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <div className="bg-white rounded-xl border border-destructive/30 p-4 space-y-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-destructive">Remedial Development Plan</span>
          <Badge label={localPlan.status} colorClass={statusColor} />
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Identified Deficiencies</label>
            <textarea
              value={(localPlan.identified_deficiencies || []).join('\n')}
              onChange={e => setLocalPlan(p => ({ ...p, identified_deficiencies: e.target.value.split('\n') }))}
              rows={4}
              className="w-full text-xs border border-input rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Corrective Actions</label>
            <div className="space-y-2">
              {(localPlan.corrective_actions || []).map((ca, i) => (
                <div key={i} className="flex items-start gap-2 bg-muted/40 rounded-lg p-2">
                  <div className="flex-1 space-y-1">
                    <input
                      value={ca.action}
                      onChange={e => {
                        const updated = [...localPlan.corrective_actions];
                        updated[i] = { ...updated[i], action: e.target.value };
                        setLocalPlan(p => ({ ...p, corrective_actions: updated }));
                      }}
                      className="w-full text-xs bg-transparent focus:outline-none border-b border-dashed border-border"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={ca.target_date || ''}
                        onChange={e => {
                          const updated = [...localPlan.corrective_actions];
                          updated[i] = { ...updated[i], target_date: e.target.value };
                          setLocalPlan(p => ({ ...p, corrective_actions: updated }));
                        }}
                        className="text-[10px] border border-input rounded px-1.5 py-0.5 bg-transparent focus:outline-none"
                      />
                      <select
                        value={ca.status}
                        onChange={e => {
                          const updated = [...localPlan.corrective_actions];
                          updated[i] = { ...updated[i], status: e.target.value };
                          setLocalPlan(p => ({ ...p, corrective_actions: updated }));
                        }}
                        className="text-[10px] border border-input rounded px-1.5 py-0.5 bg-transparent focus:outline-none"
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Reassessment date:</label>
            <input
              type="date"
              value={localPlan.reassessment_date || ''}
              onChange={e => setLocalPlan(p => ({ ...p, reassessment_date: e.target.value }))}
              className="text-xs border border-input rounded-lg px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Mentor Notes</label>
            <textarea
              value={localPlan.mentor_notes || ''}
              onChange={e => setLocalPlan(p => ({ ...p, mentor_notes: e.target.value }))}
              rows={3}
              className="w-full text-xs border border-input rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {localPlan.trainee_acknowledged ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              Acknowledged by trainee on {format(new Date(localPlan.trainee_acknowledgment_date), 'dd MMM yyyy')}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Trainee has not yet acknowledged this plan.</p>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
            {localPlan.status === 'Draft' && (
              <Button size="sm" onClick={handleActivate} disabled={activating}>
                {activating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Activate Plan (Send to Trainee)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrainingPlanTab({ assignmentId, traineeEmail, mentorEmail, sessionNumber, assignmentData }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [remedialPlan, setRemedialPlan] = useState(null);
  const [stagedItems, setStagedItems] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTrainingPlan({ assignment_id: assignmentId }),
      getRemedialPlan({ assignment_id: assignmentId }),
    ]).then(([planRes, remRes]) => {
      setItems(planRes.data?.items || []);
      setRemedialPlan(remRes.data?.plan || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [assignmentId]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await generateTrainingPlanSuggestions({
      assignment_id: assignmentId,
      trainee_email: traineeEmail,
      mentor_email: mentorEmail,
      session_number: sessionNumber,
    });
    const suggestions = (res.data?.suggestions || []).map((s, i) => ({ ...s, _key: Date.now() + i }));
    setStagedItems(suggestions);
    setGenerating(false);
    if (suggestions.length === 0) {
      toast({ title: 'No suggestions', description: 'No gaps found in the assessment data.' });
    }
  };

  const handleAddBlank = () => {
    setStagedItems(prev => [...prev, {
      _key: Date.now(),
      title: '',
      description: '',
      category: 'Custom',
      priority: 'Medium',
      due_date: '',
      source_reference: '',
    }]);
  };

  const handleSaveAndSend = async () => {
    const toSave = stagedItems
      .filter(s => s.title.trim())
      .map(({ _key, ...rest }) => ({
        ...rest,
        assignment_id: assignmentId,
        trainee_email: traineeEmail,
        mentor_email: mentorEmail,
        session_number: sessionNumber,
        visible_to_trainee: false,
        status: 'Pending',
      }));

    if (toSave.length === 0) {
      toast({ title: 'Nothing to save', description: 'Add at least one item with a title.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const saveRes = await saveTrainingPlanItems({ items: toSave });
    const saved = saveRes.data?.items || [];
    const ids = saved.map(s => s.id).filter(Boolean);

    if (ids.length > 0) {
      await approveTrainingPlanItems({ item_ids: ids });
      const updatedItems = saved.map(s => ({ ...s, visible_to_trainee: true }));
      setItems(prev => [...updatedItems, ...prev]);
    }

    setStagedItems([]);
    setSaving(false);
    toast({ title: 'Plan items saved & sent to trainee' });
  };

  const handleApproveOne = async (itemId) => {
    await approveTrainingPlanItems({ item_ids: [itemId] });
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, visible_to_trainee: true } : it));
    toast({ title: 'Item approved and sent to trainee' });
  };

  const groupedItems = {
    Pending: items.filter(i => i.status === 'Pending'),
    'In Progress': items.filter(i => i.status === 'In Progress'),
    Completed: items.filter(i => i.status === 'Completed'),
  };

  const showRemedial = assignmentData?.result === 'Not Recommended' || !!remedialPlan;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Generator */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Generate Plan Items</span>
        </div>
        <p className="text-xs text-muted-foreground">Auto-generate suggestions from assessment scores, conference ratings, and competency results.</p>
        <Button size="sm" onClick={handleGenerate} disabled={generating} className="w-full">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
          {generating ? 'Generating…' : 'Generate Suggestions from Assessment Data'}
        </Button>
      </div>

      {/* Staged items */}
      {stagedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Suggested Items ({stagedItems.length})</h4>
            <button
              onClick={handleAddBlank}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add custom
            </button>
          </div>
          {stagedItems.map((item, idx) => (
            <StagedItem
              key={item._key || idx}
              item={item}
              onChange={updated => setStagedItems(prev => prev.map((s, i) => i === idx ? updated : s))}
              onDelete={() => setStagedItems(prev => prev.filter((_, i) => i !== idx))}
            />
          ))}
          <Button className="w-full" onClick={handleSaveAndSend} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {saving ? 'Saving…' : 'Save & Send to Trainee'}
          </Button>
        </div>
      )}

      {stagedItems.length === 0 && (
        <button
          onClick={handleAddBlank}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add a custom plan item
        </button>
      )}

      {/* Saved items grouped by status */}
      {items.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Plan Items</h4>
          {['Pending', 'In Progress', 'Completed'].map(status => (
            groupedItems[status].length > 0 && (
              <div key={status} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{status}</p>
                {groupedItems[status].map(item => (
                  <PlanItemCard
                    key={item.id}
                    item={item}
                    onApprove={handleApproveOne}
                  />
                ))}
              </div>
            )
          ))}
        </div>
      )}

      {/* Remedial plan */}
      {showRemedial && remedialPlan && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">Remedial Plan</h4>
          <RemedialPlanSection plan={remedialPlan} onPlanChange={setRemedialPlan} />
        </div>
      )}
    </div>
  );
}