import { createClientFromRequest, createClient } from 'npm:@base44/sdk@0.8.25';

const QUALCREST_APP_ID = '69b3870496f1c2f1c5884db8';
const QUALCREST_SERVER_URL = 'https://base44.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trainee_email, outcome, session_number, assessment_date, assignment_id } = await req.json();
    if (!trainee_email || !outcome || !assignment_id) {
      return Response.json({ error: 'trainee_email, outcome, and assignment_id are required' }, { status: 400 });
    }

    // Connect to QualCrest portal
    const serviceToken = Deno.env.get('QUALCREST_SERVICE_TOKEN');
    const qualcrest = createClient({
      appId: QUALCREST_APP_ID,
      serverUrl: QUALCREST_SERVER_URL,
      serviceToken,
    });

    // Find trainee in QualCrest
    const trainees = await qualcrest.entities.TraineeSurveyor.filter({ trainee_email });
    if (!trainees || trainees.length === 0) {
      return Response.json({ error: 'Trainee not found in QualCrest' }, { status: 404 });
    }
    const trainee = trainees[0];

    // Determine new status and session updates for QualCrest
    let newStatus;
    let qcUpdate = {
      last_outcome: outcome,
      last_assessment_date: assessment_date,
      completed_sessions: session_number,
    };

    if (outcome === 'Recommended for Certification') {
      newStatus = 'pending_certification';
    } else if (outcome.startsWith('Recommended for Mentored Assessment')) {
      newStatus = 'active';
      // Increment session number in QualCrest
      const currentQcSession = trainee.session_number || 1;
      qcUpdate.session_number = currentQcSession + 1;
    } else if (outcome === 'Recommended for Technical Committee Review') {
      newStatus = 'pending_committee';
    } else if (outcome === 'Not Recommended') {
      newStatus = 'not_recommended';
    }

    qcUpdate.status = newStatus;

    // Update QualCrest trainee record
    await qualcrest.entities.TraineeSurveyor.update(trainee.id, qcUpdate);

    // Update local MentorTraineeAssignment via asServiceRole
    const localUpdate = {
      result: outcome,
      status: 'submitted',
      result_submitted_at: new Date().toISOString(),
    };

    if (outcome.startsWith('Recommended for Mentored Assessment')) {
      // Fetch current assignment to get current_ma_session
      const assignments = await base44.asServiceRole.entities.MentorTraineeAssignment.filter({ id: assignment_id });
      const assignment = assignments?.[0];
      const currentSession = assignment?.current_ma_session || 1;
      localUpdate.current_ma_session = currentSession + 1;
    }

    await base44.asServiceRole.entities.MentorTraineeAssignment.update(assignment_id, localUpdate);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});