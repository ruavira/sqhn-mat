import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items array is required' }, { status: 400 });
    }

    const saved = await base44.asServiceRole.entities.TrainingPlanItem.bulkCreate(items);
    return Response.json({ items: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});