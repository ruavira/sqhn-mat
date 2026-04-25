import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignment_id, session_number, trainee_email, mentor_email } = await req.json();
    if (!assignment_id || !session_number) {
      return Response.json({ error: 'assignment_id and session_number are required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const session = await base44.asServiceRole.entities.AssessmentSession.create({
      assignment_id,
      session_number,
      trainee_email: trainee_email || '',
      mentor_email: mentor_email || '',
      status: 'active',
      start_date: today,
    });

    return Response.json({ session });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});