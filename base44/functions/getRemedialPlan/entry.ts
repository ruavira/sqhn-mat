import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignment_id } = await req.json();
    if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

    const plans = await base44.asServiceRole.entities.RemedialPlan.filter({ assignment_id });
    const raw = plans?.[0] || null;
    if (!raw) return Response.json({ plan: null });
    const { mentor_email, ...plan } = raw;
    return Response.json({ plan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});