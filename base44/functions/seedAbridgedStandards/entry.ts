import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STANDARDS = [
  { chapter_code: "GG", chapter_name: "Governance & Leadership", requirement_code: "GG.1.1.1", requirement_text: "The facility has a formal governing body with documented terms of reference", is_critical: true, order_index: 1 },
  { chapter_code: "GG", chapter_name: "Governance & Leadership", requirement_code: "GG.1.2.1", requirement_text: "Governance meetings are held regularly and minutes are documented", is_critical: false, order_index: 2 },
  { chapter_code: "GG", chapter_name: "Governance & Leadership", requirement_code: "GG.2.1.1", requirement_text: "The facility has a written mission, vision and values statement", is_critical: false, order_index: 3 },
  { chapter_code: "GG", chapter_name: "Governance & Leadership", requirement_code: "GG.3.1.1", requirement_text: "Senior leadership demonstrates active commitment to quality and patient safety", is_critical: true, order_index: 4 },
  { chapter_code: "GG", chapter_name: "Governance & Leadership", requirement_code: "GG.3.2.1", requirement_text: "There is a documented strategic plan that includes quality improvement goals", is_critical: false, order_index: 5 },
  { chapter_code: "QI", chapter_name: "Quality Improvement", requirement_code: "QI.1.1.1", requirement_text: "The facility has a functional quality improvement committee", is_critical: true, order_index: 6 },
  { chapter_code: "QI", chapter_name: "Quality Improvement", requirement_code: "QI.1.2.1", requirement_text: "Quality improvement activities are documented with measurable indicators", is_critical: false, order_index: 7 },
  { chapter_code: "QI", chapter_name: "Quality Improvement", requirement_code: "QI.2.1.1", requirement_text: "Clinical and administrative departments participate in quality improvement activities", is_critical: false, order_index: 8 },
  { chapter_code: "QI", chapter_name: "Quality Improvement", requirement_code: "QI.2.2.1", requirement_text: "Quality improvement data is analysed and used for decision-making", is_critical: false, order_index: 9 },
  { chapter_code: "QI", chapter_name: "Quality Improvement", requirement_code: "QI.3.1.1", requirement_text: "Patient safety incidents are reported, investigated and acted upon", is_critical: true, order_index: 10 },
  { chapter_code: "PS", chapter_name: "Patient Safety", requirement_code: "PS.1.1.1", requirement_text: "The facility has a documented patient safety programme", is_critical: true, order_index: 11 },
  { chapter_code: "PS", chapter_name: "Patient Safety", requirement_code: "PS.1.2.1", requirement_text: "Staff are trained on patient safety practices", is_critical: false, order_index: 12 },
  { chapter_code: "PS", chapter_name: "Patient Safety", requirement_code: "PS.2.1.1", requirement_text: "Medication errors are reported through a structured incident reporting system", is_critical: false, order_index: 13 },
  { chapter_code: "PS", chapter_name: "Patient Safety", requirement_code: "PS.2.2.1", requirement_text: "Adverse events are reviewed at the management level", is_critical: false, order_index: 14 },
  { chapter_code: "PS", chapter_name: "Patient Safety", requirement_code: "PS.3.1.1", requirement_text: "The facility implements at least five patient safety goals", is_critical: true, order_index: 15 },
  { chapter_code: "IC", chapter_name: "Infection Control", requirement_code: "IC.1.1.1", requirement_text: "The facility has a functional infection prevention and control committee", is_critical: true, order_index: 16 },
  { chapter_code: "IC", chapter_name: "Infection Control", requirement_code: "IC.1.2.1", requirement_text: "An infection control programme with surveillance activities is in place", is_critical: false, order_index: 17 },
  { chapter_code: "IC", chapter_name: "Infection Control", requirement_code: "IC.2.1.1", requirement_text: "Hand hygiene compliance is monitored and acted upon", is_critical: false, order_index: 18 },
  { chapter_code: "IC", chapter_name: "Infection Control", requirement_code: "IC.2.2.1", requirement_text: "Personal protective equipment is available and used appropriately", is_critical: false, order_index: 19 },
  { chapter_code: "IC", chapter_name: "Infection Control", requirement_code: "IC.3.1.1", requirement_text: "Sterilisation and disinfection processes meet required standards", is_critical: true, order_index: 20 },
  { chapter_code: "MM", chapter_name: "Medication Management", requirement_code: "MM.1.1.1", requirement_text: "Medication procurement follows a formulary system", is_critical: true, order_index: 21 },
  { chapter_code: "MM", chapter_name: "Medication Management", requirement_code: "MM.1.2.1", requirement_text: "Medications are stored at appropriate temperatures and conditions", is_critical: false, order_index: 22 },
  { chapter_code: "MM", chapter_name: "Medication Management", requirement_code: "MM.2.1.1", requirement_text: "Medication prescribing follows written policies and guidelines", is_critical: false, order_index: 23 },
  { chapter_code: "MM", chapter_name: "Medication Management", requirement_code: "MM.2.2.1", requirement_text: "Pharmacist reviews prescriptions for high-risk medications", is_critical: false, order_index: 24 },
  { chapter_code: "MM", chapter_name: "Medication Management", requirement_code: "MM.3.1.1", requirement_text: "Medication administration is documented in the patient record", is_critical: true, order_index: 25 },
  { chapter_code: "PCC", chapter_name: "Patient-Centred Care", requirement_code: "PCC.1.1.1", requirement_text: "Patients are involved in decisions about their care", is_critical: false, order_index: 26 },
  { chapter_code: "PCC", chapter_name: "Patient-Centred Care", requirement_code: "PCC.1.2.1", requirement_text: "Patient rights and responsibilities are communicated on admission", is_critical: true, order_index: 27 },
  { chapter_code: "PCC", chapter_name: "Patient-Centred Care", requirement_code: "PCC.2.1.1", requirement_text: "Informed consent is obtained and documented before procedures", is_critical: false, order_index: 28 },
  { chapter_code: "PCC", chapter_name: "Patient-Centred Care", requirement_code: "PCC.2.2.1", requirement_text: "Patients' privacy and dignity are respected throughout their care", is_critical: false, order_index: 29 },
  { chapter_code: "PCC", chapter_name: "Patient-Centred Care", requirement_code: "PCC.3.1.1", requirement_text: "There is a formal patient complaints and feedback mechanism", is_critical: true, order_index: 30 },
  { chapter_code: "CM", chapter_name: "Clinical Management", requirement_code: "CM.1.1.1", requirement_text: "Patient assessment is conducted and documented on admission", is_critical: true, order_index: 31 },
  { chapter_code: "CM", chapter_name: "Clinical Management", requirement_code: "CM.1.2.1", requirement_text: "Care plans are developed for all admitted patients", is_critical: false, order_index: 32 },
  { chapter_code: "CM", chapter_name: "Clinical Management", requirement_code: "CM.2.1.1", requirement_text: "Clinical handover processes are standardised and documented", is_critical: false, order_index: 33 },
  { chapter_code: "CM", chapter_name: "Clinical Management", requirement_code: "CM.2.2.1", requirement_text: "Discharge planning begins early in the admission process", is_critical: false, order_index: 34 },
  { chapter_code: "CM", chapter_name: "Clinical Management", requirement_code: "CM.3.1.1", requirement_text: "Clinical documentation is complete, accurate and accessible", is_critical: true, order_index: 35 },
  { chapter_code: "HR", chapter_name: "Human Resources", requirement_code: "HR.1.1.1", requirement_text: "Staff qualifications and credentials are verified before employment", is_critical: true, order_index: 36 },
  { chapter_code: "HR", chapter_name: "Human Resources", requirement_code: "HR.1.2.1", requirement_text: "Job descriptions exist for all clinical and administrative roles", is_critical: false, order_index: 37 },
  { chapter_code: "HR", chapter_name: "Human Resources", requirement_code: "HR.2.1.1", requirement_text: "A documented orientation programme exists for new staff", is_critical: false, order_index: 38 },
  { chapter_code: "HR", chapter_name: "Human Resources", requirement_code: "HR.2.2.1", requirement_text: "Mandatory training is tracked and completed by all relevant staff", is_critical: false, order_index: 39 },
  { chapter_code: "HR", chapter_name: "Human Resources", requirement_code: "HR.3.1.1", requirement_text: "Staff performance is evaluated regularly using documented criteria", is_critical: false, order_index: 40 },
  { chapter_code: "FA", chapter_name: "Facilities & Environment", requirement_code: "FA.1.1.1", requirement_text: "The physical environment is maintained and does not pose safety risks", is_critical: true, order_index: 41 },
  { chapter_code: "FA", chapter_name: "Facilities & Environment", requirement_code: "FA.1.2.1", requirement_text: "Medical equipment is maintained and service records are documented", is_critical: false, order_index: 42 },
  { chapter_code: "FA", chapter_name: "Facilities & Environment", requirement_code: "FA.2.1.1", requirement_text: "Waste management practices comply with national standards", is_critical: true, order_index: 43 },
  { chapter_code: "FA", chapter_name: "Facilities & Environment", requirement_code: "FA.2.2.1", requirement_text: "Emergency preparedness plans are documented and tested", is_critical: false, order_index: 44 },
  { chapter_code: "FA", chapter_name: "Facilities & Environment", requirement_code: "FA.3.1.1", requirement_text: "Fire safety equipment is in place and staff are trained on its use", is_critical: false, order_index: 45 },
  { chapter_code: "RM", chapter_name: "Risk Management", requirement_code: "RM.1.1.1", requirement_text: "The facility has a documented risk register", is_critical: true, order_index: 46 },
  { chapter_code: "RM", chapter_name: "Risk Management", requirement_code: "RM.1.2.1", requirement_text: "Risks are reviewed and mitigated regularly", is_critical: false, order_index: 47 },
  { chapter_code: "RM", chapter_name: "Risk Management", requirement_code: "RM.2.1.1", requirement_text: "There is a documented business continuity plan", is_critical: false, order_index: 48 },
  { chapter_code: "RM", chapter_name: "Risk Management", requirement_code: "RM.2.2.1", requirement_text: "Clinical risk assessments are conducted for all admitted patients", is_critical: false, order_index: 49 },
  { chapter_code: "RM", chapter_name: "Risk Management", requirement_code: "RM.3.1.1", requirement_text: "The facility has a functional occurrence reporting system", is_critical: true, order_index: 50 }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if already seeded
    const existing = await base44.asServiceRole.entities.AbridgedStandard.list();
    if (existing && existing.length >= 50) {
      return Response.json({ message: 'Already seeded', count: existing.length });
    }

    // Seed in batches
    const batchSize = 10;
    let created = 0;
    for (let i = 0; i < STANDARDS.length; i += batchSize) {
      const batch = STANDARDS.slice(i, i + batchSize);
      await base44.asServiceRole.entities.AbridgedStandard.bulkCreate(batch);
      created += batch.length;
    }

    return Response.json({ message: 'Seeded successfully', count: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});