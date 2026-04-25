import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assignment_id } = await req.json();
    if (!assignment_id) return Response.json({ error: 'assignment_id required' }, { status: 400 });

    const [scores, conferences, competencies] = await Promise.all([
      base44.asServiceRole.entities.StandardsScore.filter({ assignment_id }),
      base44.asServiceRole.entities.ConferenceRecord.filter({ assignment_id }),
      base44.asServiceRole.entities.CompetencyAssessment.filter({ assignment_id }),
    ]);

    const suggestions = [];

    // Standards scores
    for (const s of scores || []) {
      if (s.score === 'Not Met') {
        suggestions.push({
          title: `Review ${s.chapter_name} — ${s.requirement_code}`,
          description: `Trainee scored Not Met on requirement ${s.requirement_code}: ${s.requirement_text}. Recommended: re-read the relevant regulations, complete practice scenarios, and discuss with mentor prior to next session.`,
          category: 'Standards',
          priority: 'High',
          source_reference: s.requirement_code,
        });
      } else if (s.score === 'Partially Met') {
        suggestions.push({
          title: `Review ${s.chapter_name} — ${s.requirement_code}`,
          description: `Trainee scored Partially Met on requirement ${s.requirement_code}: ${s.requirement_text}. Recommended: re-read the relevant regulations, complete practice scenarios, and discuss with mentor prior to next session.`,
          category: 'Standards',
          priority: 'Medium',
          source_reference: s.requirement_code,
        });
      }
    }

    // Conference needs_improvement items
    for (const conf of conferences || []) {
      const assessments = conf.mentor_item_assessments || [];
      for (const a of assessments) {
        if (a.rating === 'needs_improvement') {
          suggestions.push({
            title: `Improve conference skill: ${a.item_label}`,
            description: `Trainee received Needs Improvement on '${a.item_label}' during the ${conf.conference_type} conference. Mentor comment: ${a.comment || 'None'}. Recommended: review conference facilitation techniques and practice the specific skill before the next survey.`,
            category: 'Conference Skills',
            priority: 'Medium',
            source_reference: a.item_label,
          });
        }
      }
    }

    // Competency needs_development
    const competency = competencies?.[0];
    if (competency?.domain_scores) {
      for (const [indicator_id, val] of Object.entries(competency.domain_scores)) {
        if (val?.result === 'needs_development') {
          suggestions.push({
            title: `Develop competency: ${indicator_id}`,
            description: `Trainee received Needs Development on this competency indicator. Mentor comment: ${val.comment || 'None'}. Recommended: focused practice and study on this domain area prior to the next mentored assessment.`,
            category: 'Competency',
            priority: 'High',
            source_reference: indicator_id,
          });
        }
      }
    }

    return Response.json({ suggestions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});