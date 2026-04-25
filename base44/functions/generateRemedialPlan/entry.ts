import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support being called from another backend function (no user context)
    let user = null;
    try { user = await base44.auth.me(); } catch { /* service call */ }

    const { assignment_id, trainee_email, mentor_email, session_number } = await req.json();
    if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

    const competencies = await base44.asServiceRole.entities.CompetencyAssessment.filter({ assignment_id });
    const competency = competencies?.[0];

    const identified_deficiencies = [];
    const corrective_actions = [];
    const seenDomains = new Set();

    if (competency?.domain_scores) {
      for (const [indicator_id, val] of Object.entries(competency.domain_scores)) {
        if (val?.result === 'needs_development') {
          identified_deficiencies.push(
            `${indicator_id}: ${val.comment || 'No specific comment provided'}`
          );
          // Use first word segment as domain area to avoid duplicate actions
          const domain = indicator_id.split('_')[0] || indicator_id;
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            const target = new Date();
            target.setDate(target.getDate() + 30);
            corrective_actions.push({
              action: `Complete focused study and supervised practice in ${domain}. Review relevant survey protocols and discuss with mentor.`,
              target_date: target.toISOString().split('T')[0],
              status: 'Pending',
            });
          }
        }
      }
    }

    const reassessmentDate = new Date();
    reassessmentDate.setDate(reassessmentDate.getDate() + 90);

    // Check if a plan already exists to avoid duplicates
    const existing = await base44.asServiceRole.entities.RemedialPlan.filter({ assignment_id });
    if (existing && existing.length > 0) {
      return Response.json({ plan: existing[0] });
    }

    const plan = await base44.asServiceRole.entities.RemedialPlan.create({
      assignment_id,
      trainee_email: trainee_email || '',
      mentor_email: mentor_email || '',
      session_number: session_number || 1,
      status: 'Draft',
      identified_deficiencies,
      corrective_actions,
      reassessment_date: reassessmentDate.toISOString().split('T')[0],
      trainee_acknowledged: false,
      updated_at: new Date().toISOString(),
    });

    return Response.json({ plan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});