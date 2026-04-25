import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { record_id, ...payload } = body;

    if (!payload.trainee_email || !payload.assignment_id || !payload.conference_type) {
      return Response.json({ error: 'trainee_email, assignment_id, conference_type are required' }, { status: 400 });
    }

    let record;
    if (record_id) {
      record = await base44.asServiceRole.entities.ConferenceRecord.update(record_id, payload);
    } else {
      record = await base44.asServiceRole.entities.ConferenceRecord.create(payload);
    }

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});