import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// Mentor credentials are verified against the QualCrest Portal
// (Base44 app ID: 69b3870496f1c2f1c5884db8) — NOT the local
// SurveyorAccess entity. PMs manage mentor codes in one place
// (QualCrest Portal) and they automatically work here.
//
// ARCHITECTURE: We use the service token injected into this
// function's environment (QUALCREST_SERVICE_TOKEN secret) to
// authenticate as service role against the remote app.
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

    // Create a client for the remote QualCrest Portal using its service token
    const qualcrestClient = createClient({
      appId: QUALCREST_APP_ID,
      serviceToken,
      serverUrl: 'https://base44.app',
      requiresAuth: false,
    });

    const records = await qualcrestClient.asServiceRole.entities.SurveyorAccess.filter({
      surveyor_email: cleanEmail,
      access_code: cleanCode,
      status: 'active',
    });

    if (!records || records.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const record = records[0];

    return Response.json({
      success: true,
      name: record.surveyor_name || email,
      email: record.surveyor_email,
    });
  } catch (error) {
    return Response.json({ error: error.message, type: error.constructor?.name }, { status: 500 });
  }
});