import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignment_id, conference_type, item_assessments } = await req.json();

    if (!assignment_id || !conference_type || !Array.isArray(item_assessments)) {
      return Response.json(
        { error: 'assignment_id, conference_type, and item_assessments (array) are required' },
        { status: 400 }
      );
    }

    // Find the existing ConferenceRecord for this assignment + type
    const records = await base44.asServiceRole.entities.ConferenceRecord.filter({
      assignment_id,
      conference_type,
    });

    // Derive item_ratings and item_comments maps from the structured array
    const item_ratings = {};
    const item_comments = {};
    for (const assessment of item_assessments) {
      const key = String(assessment.item_index);
      if (assessment.rating) item_ratings[key] = assessment.rating;
      if (assessment.comment) item_comments[key] = assessment.comment;
    }

    const updatePayload = {
      mentor_item_assessments: item_assessments,
      item_ratings,
      item_comments,
      status: 'in_progress',
    };

    let record;
    if (records.length > 0) {
      record = await base44.asServiceRole.entities.ConferenceRecord.update(
        records[0].id,
        updatePayload
      );
    } else {
      record = await base44.asServiceRole.entities.ConferenceRecord.create({
        assignment_id,
        conference_type,
        ...updatePayload,
      });
    }

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});