import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { trainee_email, assignment_id, requirement_code, score_id, ...rest } = body;

    if (!trainee_email || !assignment_id || !requirement_code) {
      return Response.json({ error: 'trainee_email, assignment_id, requirement_code are required' }, { status: 400 });
    }

    const payload = {
      trainee_email,
      assignment_id,
      requirement_code,
      assessed_at: new Date().toISOString(),
      ...rest,
    };

    let record;
    if (score_id) {
      record = await base44.asServiceRole.entities.StandardsScore.update(score_id, payload);
    } else {
      record = await base44.asServiceRole.entities.StandardsScore.create(payload);
    }

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});