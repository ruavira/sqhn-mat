import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, access_code } = await req.json();

    if (!email || !access_code) {
      return Response.json({ error: 'Email and access code are required' }, { status: 400 });
    }

    const records = await base44.asServiceRole.entities.TraineeAccess.filter({
      trainee_email: email.toLowerCase().trim(),
      access_code: access_code.trim()
    });

    if (!records || records.length === 0) {
      return Response.json({ error: 'Invalid email or access code' }, { status: 401 });
    }

    const record = records[0];

    if (record.status !== 'active') {
      return Response.json({ error: 'Access code has been revoked' }, { status: 401 });
    }

    // Find current assignment
    const assignments = await base44.asServiceRole.entities.MentorTraineeAssignment.filter({
      trainee_email: email.toLowerCase().trim()
    });

    const currentAssignment = assignments.find(a => a.status !== 'submitted') || assignments[0];

    return Response.json({
      success: true,
      name: record.trainee_name,
      email: record.trainee_email,
      assigned_mentor_email: record.assigned_mentor_email,
      assignment_id: currentAssignment?.id || null,
      session_number: record.session_number || 1
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});