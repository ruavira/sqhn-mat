import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { mentor_email } = await req.json();

    if (!mentor_email) {
      return Response.json({ error: 'mentor_email is required' }, { status: 400 });
    }

    const assignments = await base44.asServiceRole.entities.MentorTraineeAssignment.filter({
      mentor_email: mentor_email.toLowerCase().trim(),
    });

    return Response.json({ assignments: assignments || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});