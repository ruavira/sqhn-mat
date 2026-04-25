import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, X, FileText, Shield } from 'lucide-react';
import { SQHN_DOMAINS } from '@/lib/competencyData';
import { format } from 'date-fns';

const ISSUER = 'SQHN Accreditation Unit — Surveyor Training Certification Program';

const ENTRANCE_AGENDA = [
  'Surveyor introductions and roles',
  'Purpose and scope of the survey',
  'Resident/patient rights and grievance process',
  'Survey methodology and schedule',
  'Medical records access procedures',
  'Staff availability and interviews',
  'Questions and facility concerns',
];

const EXIT_AGENDA = [
  'Summary of survey findings',
  'Deficiencies identified and regulatory citations',
  'Severity and scope determinations',
  'Plan of correction expectations',
  'Informal dispute resolution process',
  'Next steps and timelines',
  'Questions from facility leadership',
];

async function generatePDF(data, reportType) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const { assignment, scores, conferences, competency, planItems, remedialPlan, sessions } = data;
  const isAdmin = reportType === 'admin';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const PRIMARY = [30, 80, 140];
  const LIGHT_GRAY = [245, 246, 248];
  const MID_GRAY = [120, 130, 145];
  const DARK = [30, 35, 45];
  let pageCount = 0;

  // ─── FOOTER ─────────────────────────────────────────────────────────────────
  function addFooter(pageNum, totalPages) {
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    const footerY = PAGE_H - 8;
    const left = isAdmin
      ? `${ISSUER} | Administrative Record — Not for Distribution to Trainee`
      : `${ISSUER}`;
    doc.text(left, MARGIN, footerY, { maxWidth: CONTENT_W - 20 });
    doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, footerY, { align: 'right' });
    doc.setDrawColor(200, 205, 215);
    doc.line(MARGIN, footerY - 3, PAGE_W - MARGIN, footerY - 3);
  }

  // ─── SECTION HEADER ─────────────────────────────────────────────────────────
  function sectionHeader(text, y) {
    doc.setFillColor(...PRIMARY);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(text, MARGIN + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    return y + 13;
  }

  // ─── PAGE 1: COVER ───────────────────────────────────────────────────────────
  pageCount++;
  // Header band
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 48, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SQHN Mentored Assessment Tool', PAGE_W / 2, 22, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Surveyor Training Certification Program — Assessment Report', PAGE_W / 2, 32, { align: 'center' });

  // Copy type badge
  const badgeLabel = isAdmin ? 'ADMINISTRATIVE RECORD — CONFIDENTIAL' : 'TRAINEE COPY';
  const badgeColor = isAdmin ? [180, 30, 30] : [20, 130, 80];
  doc.setFillColor(...badgeColor);
  doc.roundedRect(PAGE_W / 2 - 45, 38, 90, 7, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(badgeLabel, PAGE_W / 2, 43, { align: 'center' });

  let y = 62;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');

  // Info block
  const fields = [
    ['Trainee', assignment.trainee_name || '—'],
    ['Facility', `${assignment.facility_name || '—'}${assignment.facility_state ? `, ${assignment.facility_state}` : ''}`],
    ['Assessment Date', assignment.assessment_date ? format(new Date(assignment.assessment_date), 'dd MMMM yyyy') : '—'],
    ['MA Session', `Mentored Assessment Session ${assignment.session_number || 1}`],
    ['Assessment Status', assignment.result || assignment.status || '—'],
    ...(isAdmin ? [
      ['Mentor', `${assignment.mentor_name || '—'} (${assignment.mentor_email || '—'})`],
    ] : [
      ['Assessed by', ISSUER],
    ]),
    ['Report Generated', format(new Date(), 'dd MMMM yyyy')],
  ];

  fields.forEach(([label, value]) => {
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MID_GRAY);
    doc.text(label, MARGIN + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(String(value), MARGIN + 52, y + 5.5, { maxWidth: CONTENT_W - 55 });
    y += 9.5;
  });

  if (!isAdmin) {
    y += 8;
    doc.setFillColor(235, 245, 255);
    doc.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MID_GRAY);
    doc.text(
      'This report has been issued by the SQHN Accreditation Unit — Surveyor Training Certification Program\nin accordance with established assessment criteria and mentored assessment protocols.',
      MARGIN + 5, y + 6, { maxWidth: CONTENT_W - 10 }
    );
  }

  // ─── PAGE 2: STANDARDS SCORING ───────────────────────────────────────────────
  doc.addPage();
  pageCount++;
  y = MARGIN;
  y = sectionHeader('Standards Assessment Summary', y);

  // Group scores by chapter
  const chapters = {};
  (scores || []).forEach(s => {
    const key = s.chapter_code || s.chapter_name || 'Unknown';
    if (!chapters[key]) chapters[key] = { chapter_code: s.chapter_code, chapter_name: s.chapter_name, items: [] };
    chapters[key].items.push(s);
  });

  const scoreCount = (items, val) => items.filter(i => i.score === val).length;
  const chapterRows = Object.values(chapters).map(ch => [
    ch.chapter_code || '',
    ch.chapter_name || '',
    ch.items.length,
    scoreCount(ch.items, 'Fully Met'),
    scoreCount(ch.items, 'Partially Met'),
    scoreCount(ch.items, 'Not Met'),
    scoreCount(ch.items, 'N/A'),
  ]);

  const allItems = scores || [];
  const totalRow = [
    '', 'TOTAL',
    allItems.length,
    scoreCount(allItems, 'Fully Met'),
    scoreCount(allItems, 'Partially Met'),
    scoreCount(allItems, 'Not Met'),
    scoreCount(allItems, 'N/A'),
  ];

  autoTable(doc, {
    startY: y,
    head: [['Code', 'Chapter', 'Total', 'Fully Met', 'Partial', 'Not Met', 'N/A']],
    body: [...chapterRows, totalRow],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 16 },
      2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' },
      5: { halign: 'center' }, 6: { halign: 'center' },
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === chapterRows.length) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 230, 242];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;
  const fullyMet = scoreCount(allItems, 'Fully Met');
  const assessed = allItems.filter(i => i.score && i.score !== 'N/A').length;
  const pct = assessed > 0 ? Math.round((fullyMet / assessed) * 100) : 0;
  const attention = scoreCount(allItems, 'Partially Met') + scoreCount(allItems, 'Not Met');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(`Overall compliance rate (Fully Met): ${pct}%   |   Requirements needing attention: ${attention}`, MARGIN, y);

  // ─── PAGE 3: CONFERENCE ASSESSMENTS ──────────────────────────────────────────
  doc.addPage();
  pageCount++;
  y = MARGIN;
  y = sectionHeader('Conference Assessments', y);

  const confTypes = [
    { type: 'entrance', label: 'Entrance Conference', agenda: ENTRANCE_AGENDA },
    { type: 'exit', label: 'Exit Conference', agenda: EXIT_AGENDA },
  ];

  for (const { type, label, agenda } of confTypes) {
    const conf = (conferences || []).find(c => c.conference_type === type);
    const assessments = conf?.mentor_item_assessments || [];

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text(label, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    y += 5;

    const commentCol = isAdmin ? 'Mentor Comments' : 'Assessment Feedback';

    autoTable(doc, {
      startY: y,
      head: [['#', 'Agenda Item', 'Rating', commentCol]],
      body: agenda.map((item, idx) => {
        const a = assessments.find(a => a.item_index === idx);
        const rating = a?.rating === 'satisfactory' ? 'Satisfactory'
          : a?.rating === 'needs_improvement' ? 'Needs Improvement'
          : '—';
        return [idx + 1, item, rating, a?.comment || '—'];
      }),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [60, 100, 155], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { cellWidth: 32 },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 2 && hookData.section === 'body') {
          const val = hookData.cell.raw;
          if (val === 'Needs Improvement') hookData.cell.styles.textColor = [180, 60, 60];
          if (val === 'Satisfactory') hookData.cell.styles.textColor = [30, 120, 60];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ─── PAGE 4: COMPETENCY ASSESSMENT ───────────────────────────────────────────
  doc.addPage();
  pageCount++;
  y = MARGIN;
  y = sectionHeader('Competency Assessment — 28 Indicators across 7 Domains', y);

  const domainScores = competency?.domain_scores || {};
  const commentColLabel = isAdmin ? 'Mentor Comments' : 'Feedback';

  for (const domain of SQHN_DOMAINS) {
    const domainPass = domain.indicators.filter(ind => domainScores[ind.id]?.result === 'pass').length;
    const domainTotal = domain.indicators.length;

    // Domain header
    doc.setFillColor(220, 230, 242);
    const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : y;
    autoTable(doc, {
      startY: currentY,
      head: [[{ content: `Domain ${domain.id}: ${domain.title} (${domainPass}/${domainTotal} Pass)`, colSpan: 3 }]],
      body: domain.indicators.map(ind => {
        const s = domainScores[ind.id];
        const result = s?.result === 'pass' ? 'Pass' : s?.result === 'needs_development' ? 'Needs Development' : '—';
        return [ind.id, result, s?.comment || '—'];
      }),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [60, 100, 155], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 38 },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 1 && hookData.section === 'body') {
          const val = hookData.cell.raw;
          if (val === 'Needs Development') hookData.cell.styles.textColor = [180, 60, 60];
          if (val === 'Pass') hookData.cell.styles.textColor = [30, 120, 60];
        }
      },
    });
  }

  // ─── PAGE 5: OUTCOME & RECOMMENDATIONS ───────────────────────────────────────
  doc.addPage();
  pageCount++;
  y = MARGIN;
  y = sectionHeader('Assessment Outcome & Recommendations', y);

  const outcome = competency?.overall_outcome || assignment.result || '—';

  // Outcome box
  doc.setFillColor(235, 245, 255);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, 'F');
  doc.setDrawColor(...PRIMARY);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MID_GRAY);
  doc.text('ASSESSMENT OUTCOME', MARGIN + 5, y + 7);
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text(outcome, MARGIN + 5, y + 17);
  y += 28;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MID_GRAY);
  if (isAdmin) {
    doc.text(
      `Assessed by: ${assignment.mentor_name || '—'} (${assignment.mentor_email || '—'})  |  Date: ${assignment.assessment_date ? format(new Date(assignment.assessment_date), 'dd MMM yyyy') : '—'}`,
      MARGIN, y
    );
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Mentor signature: _______________________________________________', MARGIN, y);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(
      'This outcome has been determined by the SQHN Accreditation Unit — Surveyor Training Certification Program\nin accordance with established assessment criteria.',
      MARGIN, y, { maxWidth: CONTENT_W }
    );
  }
  y += 12;

  if (competency?.overall_comments) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text('Overall Comments', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(competency.overall_comments, MARGIN, y, { maxWidth: CONTENT_W });
    y += doc.getTextDimensions(competency.overall_comments, { maxWidth: CONTENT_W }).h + 6;
  }

  if (planItems && planItems.length > 0) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY);
    doc.text('Development Plan Items', MARGIN, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Title', 'Category', 'Priority', 'Due Date', 'Status']],
      body: planItems.map(item => [
        item.title, item.category || '—', item.priority || '—',
        item.due_date || '—', item.status || '—',
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (remedialPlan && (isAdmin || remedialPlan.status === 'Active' || remedialPlan.status === 'Completed')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor([180, 30, 30]);
    doc.text('Remedial Development Plan', MARGIN, y);
    y += 5;

    const deficiencies = (remedialPlan.identified_deficiencies || []).map((d, i) => `${i + 1}. ${d}`).join('\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(deficiencies || 'No deficiencies listed', MARGIN, y, { maxWidth: CONTENT_W });
    y += doc.getTextDimensions(deficiencies || ' ', { maxWidth: CONTENT_W }).h + 6;

    if ((remedialPlan.corrective_actions || []).length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Corrective Action', 'Target Date', 'Status']],
        body: remedialPlan.corrective_actions.map(ca => [ca.action, ca.target_date || '—', ca.status || '—']),
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [180, 60, 60], textColor: 255, fontStyle: 'bold' },
      });
    }
  }

  // ─── PAGE 6: SESSION HISTORY ─────────────────────────────────────────────────
  if (sessions && sessions.length > 1) {
    doc.addPage();
    pageCount++;
    y = MARGIN;
    y = sectionHeader('Assessment Session History', y);

    autoTable(doc, {
      startY: y,
      head: [['Session #', 'Start Date', 'End Date', 'Status', 'Outcome']],
      body: sessions.map(s => [
        `MA ${s.session_number}`,
        s.start_date || '—',
        s.end_date || '—',
        s.status || '—',
        s.outcome || '—',
      ]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    });
  }

  // ─── APPLY FOOTERS ───────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    addFooter(i, total);
  }

  const fileName = isAdmin
    ? `SQHN_AdminReport_${(assignment.trainee_name || 'Trainee').replace(/\s+/g, '_')}_MA${assignment.session_number || 1}.pdf`
    : `SQHN_AssessmentReport_${(assignment.trainee_name || 'Trainee').replace(/\s+/g, '_')}_MA${assignment.session_number || 1}.pdf`;

  doc.save(fileName);
}

export default function AssessmentReportGenerator({ data, onClose, showAdminOption = false }) {
  const [generatingTrainee, setGeneratingTrainee] = useState(false);
  const [generatingAdmin, setGeneratingAdmin] = useState(false);

  const handleDownload = async (type) => {
    if (type === 'trainee') setGeneratingTrainee(true);
    else setGeneratingAdmin(true);
    await generatePDF(data, type);
    if (type === 'trainee') setGeneratingTrainee(false);
    else setGeneratingAdmin(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold">Assessment Report</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {data.assignment?.trainee_name} — MA Session {data.assignment?.session_number || 1}
        </p>

        <div className="space-y-2">
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={() => handleDownload('trainee')}
            disabled={generatingTrainee || generatingAdmin}
          >
            {generatingTrainee
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            {generatingTrainee ? 'Generating…' : 'Download Trainee Copy'}
          </Button>

          {showAdminOption && (
            <Button
              className="w-full justify-start gap-2"
              onClick={() => handleDownload('admin')}
              disabled={generatingTrainee || generatingAdmin}
            >
              {generatingAdmin
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Shield className="w-4 h-4" />}
              {generatingAdmin ? 'Generating…' : 'Download Admin Copy'}
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground italic text-center">
          {showAdminOption
            ? 'Admin copy includes full mentor attribution and is marked Confidential.'
            : 'Issued by: SQHN Accreditation Unit — Surveyor Training Certification Program'}
        </p>
      </div>
    </div>
  );
}