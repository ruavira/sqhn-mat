import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_ids } = await req.json();
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return Response.json({ error: 'item_ids array required' }, { status: 400 });
    }

    await Promise.all(
      item_ids.map(id =>
        base44.asServiceRole.entities.TrainingPlanItem.update(id, { visible_to_trainee: true })
      )
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});