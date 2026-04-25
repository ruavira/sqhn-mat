import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, access_code } = await req.json();

    if (!email || !access_code) {
      return Response.json({ error: 'Email and access code are required' }, { status: 400 });
    }

    const records = await base44.asServiceRole.entities.SurveyorAccess.filter({
      surveyor_email: email.toLowerCase().trim(),
      access_code: access_code.trim()
    });

    if (!records || records.length === 0) {
      return Response.json({ error: 'Invalid email or access code' }, { status: 401 });
    }

    const record = records[0];

    if (record.status !== 'active') {
      return Response.json({ error: 'Access code has been revoked' }, { status: 401 });
    }

    // Update last used timestamp
    await base44.asServiceRole.entities.SurveyorAccess.update(record.id, {
      last_used_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      name: record.surveyor_name || email,
      email: record.surveyor_email
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});