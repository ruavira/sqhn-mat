import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { assignment_id } = await req.json();

    if (!assignment_id) {
      return Response.json({ error: 'assignment_id is required' }, { status: 400 });
    }

    const [assignments, scores, conferences, competencies] = await Promise.all([
      base44.asServiceRole.entities.MentorTraineeAssignment.filter({ id: assignment_id }),
      base44.asServiceRole.entities.StandardsScore.filter({ assignment_id }),
      base44.asServiceRole.entities.ConferenceRecord.filter({ assignment_id }),
      base44.asServiceRole.entities.CompetencyAssessment.filter({ assignment_id }),
    ]);

    return Response.json({
      assignment: assignments[0] || null,
      scores: scores || [],
      conferences: conferences || [],
      competency: competencies[0] || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});