import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { assessment_id, update_assignment, ...payload } = body;

    if (!payload.mentor_email || !payload.trainee_email || !payload.assignment_id) {
      return Response.json({ error: 'mentor_email, trainee_email, assignment_id are required' }, { status: 400 });
    }

    let record;
    if (assessment_id) {
      record = await base44.asServiceRole.entities.CompetencyAssessment.update(assessment_id, payload);
    } else {
      record = await base44.asServiceRole.entities.CompetencyAssessment.create(payload);
    }

    // If submitting, also update the assignment status
    if (update_assignment && payload.status === 'submitted') {
      await base44.asServiceRole.entities.MentorTraineeAssignment.update(payload.assignment_id, {
        status: 'submitted',
        result: payload.overall_outcome,
        result_submitted_at: new Date().toISOString(),
      });
    }

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});