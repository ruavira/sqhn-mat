import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignment_id } = await req.json();
    if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

    const notes = await base44.asServiceRole.entities.MentorNote.filter(
      { assignment_id },
      '-created_at',
    );

    return Response.json({ notes: notes || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});