import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      assignment_id,
      trainee_email,
      mentor_email,
      session_number,
      content,
      note_type,
      tags,
      transcription_pending,
    } = await req.json();

    if (!assignment_id || !content) {
      return Response.json({ error: 'assignment_id and content are required' }, { status: 400 });
    }

    const record = await base44.asServiceRole.entities.MentorNote.create({
      assignment_id,
      trainee_email: trainee_email || '',
      mentor_email: mentor_email || user.email,
      session_number: session_number || 1,
      content,
      note_type: note_type || 'text',
      tags: tags || [],
      transcription_pending: transcription_pending || false,
      created_at: new Date().toISOString(),
    });

    return Response.json({ note: record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});