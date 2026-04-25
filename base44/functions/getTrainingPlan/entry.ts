import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignment_id } = await req.json();
    if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

    const items = await base44.asServiceRole.entities.TrainingPlanItem.filter(
      { assignment_id },
      'created_date'
    );

    const sorted = (items || []).sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_date) - new Date(b.created_date);
    });

    return Response.json({ items: sorted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});