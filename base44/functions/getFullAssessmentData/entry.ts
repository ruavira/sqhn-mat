import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignment_id } = await req.json();
    if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

    const [
      assignments,
      scores,
      conferences,
      competencies,
      planItems,
      remedialPlans,
      sessions,
    ] = await Promise.all([
      base44.asServiceRole.entities.MentorTraineeAssignment.filter({ id: assignment_id }),
      base44.asServiceRole.entities.StandardsScore.filter({ assignment_id }),
      base44.asServiceRole.entities.ConferenceRecord.filter({ assignment_id }),
      base44.asServiceRole.entities.CompetencyAssessment.filter({ assignment_id }),
      base44.asServiceRole.entities.TrainingPlanItem.filter({ assignment_id }),
      base44.asServiceRole.entities.RemedialPlan.filter({ assignment_id }),
      base44.asServiceRole.entities.AssessmentSession.filter({ assignment_id }),
    ]);

    return Response.json({
      assignment: assignments?.[0] || null,
      scores: scores || [],
      conferences: conferences || [],
      competency: competencies?.[0] || null,
      planItems: (planItems || []).filter(i => i.visible_to_trainee),
      remedialPlan: remedialPlans?.[0] || null,
      sessions: (sessions || []).sort((a, b) => a.session_number - b.session_number),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});