import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id, status, trainee_progress_notes } = await req.json();
    if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

    const changes = {};
    if (status !== undefined) changes.status = status;
    if (trainee_progress_notes !== undefined) changes.trainee_progress_notes = trainee_progress_notes;

    const updated = await base44.asServiceRole.entities.TrainingPlanItem.update(item_id, changes);
    return Response.json({ item: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});