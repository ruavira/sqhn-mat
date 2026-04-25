import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignment_id } = await req.json();
    if (!assignment_id) {
      return Response.json({ error: 'assignment_id is required' }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.AssessmentSession.filter(
      { assignment_id },
      'session_number',
      50
    );

    return Response.json({ sessions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});