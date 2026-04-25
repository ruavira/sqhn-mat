import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_id } = await req.json();
    if (!plan_id) return Response.json({ error: 'plan_id required' }, { status: 400 });

    const updated = await base44.asServiceRole.entities.RemedialPlan.update(plan_id, {
      status: 'Active',
      updated_at: new Date().toISOString(),
    });
    return Response.json({ plan: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});