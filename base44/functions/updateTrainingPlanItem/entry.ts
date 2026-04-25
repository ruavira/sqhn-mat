import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id, changes } = await req.json();
    if (!item_id || !changes) return Response.json({ error: 'item_id and changes required' }, { status: 400 });

    const updated = await base44.asServiceRole.entities.TrainingPlanItem.update(item_id, changes);
    return Response.json({ item: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});