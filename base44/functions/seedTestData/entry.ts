import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Seed mentor access
    const mentors = await base44.asServiceRole.entities.SurveyorAccess.filter({ surveyor_email: 'mentor@sqhn.ng' });
    if (mentors.length === 0) {
      await base44.asServiceRole.entities.SurveyorAccess.create({
        surveyor_email: 'mentor@sqhn.ng',
        surveyor_name: 'Dr. Adaeze Okafor',
        access_code: 'SQHN2024',
        status: 'active',
        issued_by_email: 'admin@sqhn.ng',
      });
    }

    // Seed trainee access
    const trainees = await base44.asServiceRole.entities.TraineeAccess.filter({ trainee_email: 'trainee@sqhn.ng' });
    if (trainees.length === 0) {
      await base44.asServiceRole.entities.TraineeAccess.create({
        trainee_email: 'trainee@sqhn.ng',
        trainee_name: 'Chukwuma Eze',
        access_code: 'TRAIN2024',
        assigned_mentor_email: 'mentor@sqhn.ng',
        cohort: 'Cohort 1',
        status: 'active',
        issued_by_email: 'admin@sqhn.ng',
        session_number: 1,
      });
    }

    // Seed assignment
    const assignments = await base44.asServiceRole.entities.MentorTraineeAssignment.filter({ trainee_email: 'trainee@sqhn.ng' });
    let assignmentId;
    if (assignments.length === 0) {
      const created = await base44.asServiceRole.entities.MentorTraineeAssignment.create({
        mentor_email: 'mentor@sqhn.ng',
        mentor_name: 'Dr. Adaeze Okafor',
        trainee_email: 'trainee@sqhn.ng',
        trainee_name: 'Chukwuma Eze',
        session_number: 1,
        status: 'in_progress',
        facility_name: 'Lagos University Teaching Hospital',
        facility_state: 'Lagos',
        assessment_date: '2026-05-01',
        cohort: 'Cohort 1',
      });
      assignmentId = created.id;
    } else {
      assignmentId = assignments[0].id;
    }

    return Response.json({ message: 'Test data seeded', assignmentId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});