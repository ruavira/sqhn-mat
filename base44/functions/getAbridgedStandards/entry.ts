import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const standards = await base44.asServiceRole.entities.AbridgedStandard.list('order_index', 200);
    return Response.json({ standards: standards || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});