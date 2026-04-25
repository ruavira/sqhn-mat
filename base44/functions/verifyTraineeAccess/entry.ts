import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// Trainee credentials are verified against the QualCrest Portal
// (Base44 app ID: 69b3870496f1c2f1c5884db8) — NOT the local
// TraineeAccess entity. Uses the same cross-app pattern as
// verifyMentorAccess.
// ============================================================

const QUALCREST_APP_ID = '69b3870496f1c2f1c5884db8';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, access_code } = await req.json();

    if (!email || !access_code) {
      return Response.json({ error: 'Email and access code are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = access_code.trim();

    const serviceToken = Deno.env.get('QUALCREST_SERVICE_TOKEN');
    if (!serviceToken) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create a client for the remote QualCrest Portal
    const qualcrestClient = createClient({
      appId: QUALCREST_APP_ID,
      serviceToken,
      serverUrl: 'https://base44.app',
      requiresAuth: false,
    });

    const records = await qualcrestClient.asServiceRole.entities.TraineeSurveyor.filter({
      trainee_email: cleanEmail,
      access_code: cleanCode,
      status: 'active',
    });

    if (!records || records.length === 0) {
      return Response.json({ error: 'Invalid email or access code' }, { status: 401 });
    }

    const record = records[0];

    // Look up active assignment in local app
    const assignments = await base44.asServiceRole.entities.MentorTraineeAssignment.filter({
      trainee_email: cleanEmail,
    });
    const currentAssignment = assignments.find(a => a.status !== 'submitted') || null;

    return Response.json({
      success: true,
      name: record.trainee_name,
      email: record.trainee_email,
      assigned_mentor_email: record.assigned_mentor_email,
      session_number: record.session_number || 1,
      assignment_id: currentAssignment?.id || null,
    });
  } catch (error) {
    return Response.json({ error: error.message, type: error.constructor?.name }, { status: 500 });
  }
});