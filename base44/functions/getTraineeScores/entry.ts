import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { trainee_email, assignment_id } = await req.json();

    if (!trainee_email || !assignment_id) {
      return Response.json({ error: 'trainee_email and assignment_id are required' }, { status: 400 });
    }

    const scores = await base44.asServiceRole.entities.StandardsScore.filter({
      trainee_email,
      assignment_id,
    });

    return Response.json({ scores: scores || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});