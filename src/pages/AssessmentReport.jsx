import React, { useEffect, useState, useRef } from 'react';
import { getFullAssessmentData } from '@/functions/getFullAssessmentData';
import { getSession } from '@/lib/sqhnSession';
import { SQHN_DOMAINS } from '@/lib/competencyData';
import { Loader2, Lock } from 'lucide-react';
import { format } from 'date-fns';

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

function fmt(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return d; }
}

// ── Shared display primitives ────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      background: '#1e5096', color: '#fff', fontWeight: 700, fontSize: 13,
      padding: '6px 12px', marginTop: 24, marginBottom: 8, pageBreakAfter: 'avoid',
    }}>
      {children}
    </div>
  );
}

function InfoGrid({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? '#f5f7fa' : '#fff' }}>
            <td style={{ padding: '5px 10px', fontWeight: 600, color: '#555', width: '36%' }}>{label}</td>
            <td style={{ padding: '5px 10px', color: '#222' }}>{value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportTable({ headers, rows, getRowStyle }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 4 }}>
      <thead>
        <tr style={{ background: '#2c6fc0', color: '#fff' }}>
          {headers.map((h, i) => <th key={i} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: getRowStyle ? getRowStyle(i) : (i % 2 === 0 ? '#f9fafc' : '#fff') }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Review-mode UI helpers ───────────────────────────────────────────────────

function EditableField({ label, value, onChange, rows = 3 }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 3, padding: '1px 5px' }}>
          Editable
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{label}</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{
          width: '100%', fontSize: 11, padding: '6px 10px',
          border: '1.5px solid #fde68a', borderRadius: 6, background: '#fffbeb',
          resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: '#222',
          outline: 'none',
        }}
      />
    </div>
  );
}

function LockedField({ label, value }) {
  return (
    <div title="This field reflects the recorded assessment and cannot be changed here." style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <Lock style={{ width: 10, height: 10, color: '#9ca3af' }} />
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 5, padding: '5px 10px', color: '#374151' }}>
        {value || '—'}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AssessmentReport() {
  const pathParts = window.location.pathname.split('/');
  const assignmentId = pathParts[pathParts.length - 1];
  const params = new URLSearchParams(window.location.search);
  const reportType = params.get('type') || 'trainee';
  const isAdmin = reportType === 'admin';

  // If trainee type → always go directly to print/clean mode
  const [mode, setMode] = useState(isAdmin ? 'review' : 'print');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const didPrint = useRef(false);

  // Editable state
  const [execSummary, setExecSummary] = useState('');
  const [finalObs, setFinalObs] = useState('');
  const [sigName, setSigName] = useState('');
  const [sigDate, setSigDate] = useState(format(new Date(), 'dd MMM yyyy'));
  // conf comments: { 'entrance-0': '...', 'exit-2': '...' }
  const [confComments, setConfComments] = useState({});
  // competency comments: { '1.1': '...' }
  const [compComments, setCompComments] = useState({});

  useEffect(() => {
    const session = getSession();
    if (!session) { window.location.href = '/'; return; }

    // Pre-fill mentor name from session
    if (session.name || session.full_name) setSigName(session.name || session.full_name);

    getFullAssessmentData({ assignment_id: assignmentId })
      .then(res => {
        if (res.data?.error) { setError(res.data.error); setLoading(false); return; }
        const d = res.data;
        setData(d);

        // Pre-fill editable comments from saved data
        const initConf = {};
        (d.conferences || []).forEach(conf => {
          (conf.mentor_item_assessments || []).forEach(a => {
            initConf[`${conf.conference_type}-${a.item_index}`] = a.comment || '';
          });
        });
        setConfComments(initConf);

        const initComp = {};
        const ds = d.competency?.domain_scores || {};
        Object.entries(ds).forEach(([id, val]) => { initComp[id] = val?.comment || ''; });
        setCompComments(initComp);

        // Pre-fill exec summary from sessionStorage if trainee copy
        if (!isAdmin) {
          const stored = sessionStorage.getItem(`sqhn_report_executive_summary_${assignmentId}`);
          if (stored) setExecSummary(stored);
        }

        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [assignmentId]);

  // Auto-print in print mode (trainee copy opened from mentor approval)
  useEffect(() => {
    if (mode === 'print' && !isAdmin && data && !didPrint.current) {
      didPrint.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [mode, data, isAdmin]);

  function handleApproveTrainee() {
    sessionStorage.setItem(`sqhn_report_executive_summary_${assignmentId}`, execSummary);
    window.open(`/report/${assignmentId}?type=trainee`, '_blank');
  }

  function handleApproveAdmin() {
    setMode('print');
    setTimeout(() => window.print(), 500);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#1e5096', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }
  if (error || !data?.assignment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <p style={{ color: '#b91c1c', fontWeight: 600 }}>Unable to load assessment data.</p>
        <p style={{ color: '#666', fontSize: 13 }}>{error}</p>
      </div>
    );
  }

  const { assignment, scores, conferences, competency, planItems, remedialPlan, sessions } = data;

  // Standards rollup
  const chapters = {};
  scores.forEach(s => {
    const k = s.chapter_code || 'Other';
    if (!chapters[k]) chapters[k] = { code: s.chapter_code, name: s.chapter_name, items: [] };
    chapters[k].items.push(s);
  });
  const cnt = (items, v) => items.filter(i => i.score === v).length;
  const allAssessed = scores.filter(s => s.score && s.score !== 'N/A');
  const fullyMetPct = allAssessed.length > 0 ? Math.round((cnt(scores, 'Fully Met') / allAssessed.length) * 100) : 0;

  const entrance = conferences.find(c => c.conference_type === 'entrance');
  const exit = conferences.find(c => c.conference_type === 'exit');
  const domain_scores = competency?.domain_scores || {};

  const isReview = mode === 'review' && isAdmin;

  const printStyles = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; }
      .report-root { padding: 0; }
      .section-block { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      @page {
        margin: 1cm;
        @bottom-center {
          content: "SQHN Accreditation Unit — Surveyor Training Certification Program | Confidential Assessment Document | Page " counter(page);
          font-size: 9px; color: #666;
        }
      }
    }
  `;

  // ── REPORT BODY (shared between review and print) ────────────────────────────
  const reportBody = (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 0', fontFamily: 'Inter, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
        <div style={{ width: 56, height: 56, background: '#1e5096', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>
          SQHN
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e5096', lineHeight: 1.2 }}>Mentored Assessment Tool — Assessment Report</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Surveyor Training Certification Program</div>
        </div>
      </div>

      <div style={{ background: isAdmin ? '#b91c1c' : '#1e5096', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '5px 0', borderRadius: 4, marginBottom: 20, letterSpacing: 1 }}>
        {isAdmin ? 'ADMINISTRATIVE RECORD — CONFIDENTIAL' : 'TRAINEE COPY'}
      </div>

      {/* Executive Summary */}
      {(execSummary || isReview) && (
        <div className="section-block" style={{ marginBottom: 16 }}>
          <SectionTitle>Executive Summary</SectionTitle>
          {isReview ? (
            <EditableField
              label="Executive Summary (appears on both copies, write in programme voice)"
              value={execSummary}
              onChange={setExecSummary}
              rows={5}
            />
          ) : (
            execSummary && (
              <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{execSummary}</p>
            )
          )}
        </div>
      )}

      {/* Section 1: Assessment Details */}
      <div className="section-block">
        <SectionTitle>Assessment Details</SectionTitle>
        {isReview ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <LockedField label="Trainee Name" value={assignment.trainee_name} />
            <LockedField label="Facility" value={assignment.facility_name} />
            <LockedField label="Facility State" value={assignment.facility_state} />
            <LockedField label="Assessment Date" value={fmt(assignment.assessment_date)} />
            <LockedField label="MA Session" value={`Session ${assignment.session_number || 1}`} />
            <LockedField label="Mentor Name" value={assignment.mentor_name} />
            <LockedField label="Mentor Email" value={assignment.mentor_email} />
          </div>
        ) : (
          <InfoGrid rows={[
            ['Trainee Name', assignment.trainee_name],
            ['Facility', assignment.facility_name],
            ['Facility State', assignment.facility_state],
            ['Assessment Date', fmt(assignment.assessment_date)],
            ['MA Session', `Mentored Assessment Session ${assignment.session_number || 1}`],
            ...(isAdmin
              ? [['Mentor Name', assignment.mentor_name], ['Mentor Email', assignment.mentor_email]]
              : [['Assessed by', 'SQHN Accreditation Unit — Surveyor Training Certification Program']]),
            ['Report Generated', fmt(new Date().toISOString())],
          ]} />
        )}
      </div>

      {/* Section 2: Standards Scoring */}
      <div className="section-block">
        <SectionTitle>Standards Assessment Summary</SectionTitle>
        <ReportTable
          headers={['Code', 'Chapter', 'Fully Met', 'Partially Met', 'Not Met', 'N/A', 'Total']}
          rows={[
            ...Object.values(chapters).map(ch => [ch.code, ch.name, cnt(ch.items, 'Fully Met'), cnt(ch.items, 'Partially Met'), cnt(ch.items, 'Not Met'), cnt(ch.items, 'N/A'), ch.items.length]),
            ['', <strong>TOTAL</strong>, <strong>{cnt(scores, 'Fully Met')}</strong>, <strong>{cnt(scores, 'Partially Met')}</strong>, <strong>{cnt(scores, 'Not Met')}</strong>, <strong>{cnt(scores, 'N/A')}</strong>, <strong>{scores.length}</strong>],
          ]}
          getRowStyle={i => i === Object.values(chapters).length ? '#dce6f1' : i % 2 === 0 ? '#f9fafc' : '#fff'}
        />
        <p style={{ fontSize: 11, color: '#444', marginTop: 6 }}>
          Overall compliance rate: <strong>{fullyMetPct}%</strong> &nbsp;|&nbsp; Requiring attention: <strong>{cnt(scores, 'Partially Met') + cnt(scores, 'Not Met')}</strong>
        </p>
      </div>

      {/* Section 3: Conference Assessments */}
      <div className="section-block">
        <SectionTitle>Conference Assessments</SectionTitle>
        {[
          { label: 'Entrance Conference', conf: entrance, agenda: ENTRANCE_AGENDA, type: 'entrance' },
          { label: 'Exit Conference', conf: exit, agenda: EXIT_AGENDA, type: 'exit' },
        ].map(({ label, conf, agenda, type }) => (
          <div key={type} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 12, color: '#1e5096', marginBottom: 4 }}>{label}</p>
            {!conf ? (
              <p style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>Conference not yet completed.</p>
            ) : isReview ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#2c6fc0', color: '#fff' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left', width: 28 }}>#</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Agenda Item</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', width: 130 }}>Rating</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left', width: '35%' }}>Comments (Editable)</th>
                  </tr>
                </thead>
                <tbody>
                  {agenda.map((item, idx) => {
                    const a = (conf.mentor_item_assessments || []).find(x => x.item_index === idx);
                    const key = `${type}-${idx}`;
                    const rating = a?.rating === 'satisfactory' ? 'Satisfactory' : a?.rating === 'needs_improvement' ? 'Needs Improvement' : '—';
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fafc' : '#fff', verticalAlign: 'top' }}>
                        <td style={{ padding: '4px 8px' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 8px' }}>{item}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 600, color: a?.rating === 'satisfactory' ? '#166534' : a?.rating === 'needs_improvement' ? '#b45309' : '#666' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock style={{ width: 9, height: 9, color: '#9ca3af' }} title="Locked" />
                            {rating}
                          </div>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <textarea
                            value={confComments[key] ?? (a?.comment || '')}
                            onChange={e => setConfComments(prev => ({ ...prev, [key]: e.target.value }))}
                            rows={2}
                            style={{ width: '100%', fontSize: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '3px 6px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <ReportTable
                headers={['#', 'Agenda Item', 'Rating', isAdmin ? 'Mentor Comments' : 'Comments']}
                rows={agenda.map((item, idx) => {
                  const a = (conf.mentor_item_assessments || []).find(x => x.item_index === idx);
                  const key = `${type}-${idx}`;
                  const rating = a?.rating === 'satisfactory' ? 'Satisfactory' : a?.rating === 'needs_improvement' ? 'Needs Improvement' : '—';
                  return [
                    idx + 1, item,
                    <span style={{ color: a?.rating === 'satisfactory' ? '#166534' : a?.rating === 'needs_improvement' ? '#b45309' : '#666', fontWeight: 600 }}>{rating}</span>,
                    confComments[key] ?? a?.comment ?? '—',
                  ];
                })}
              />
            )}
          </div>
        ))}
      </div>

      {/* Section 4: Competency */}
      <div className="section-block">
        <SectionTitle>Competency Assessment — 28 Indicators across 7 Domains</SectionTitle>
        {SQHN_DOMAINS.map(domain => {
          const domainPass = domain.indicators.filter(ind => domain_scores[ind.id]?.result === 'pass').length;
          return (
            <div key={domain.id} style={{ marginBottom: 12 }} className="section-block">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#374151', color: '#fff' }}>
                    <th colSpan={3} style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 700 }}>
                      Domain {domain.id}: {domain.title}&nbsp;
                      <span style={{ fontWeight: 400, fontSize: 10 }}>({domainPass}/{domain.indicators.length} Pass)</span>
                    </th>
                  </tr>
                  <tr style={{ background: '#e5e7eb', fontSize: 10 }}>
                    <th style={{ padding: '3px 8px', textAlign: 'left', width: '10%' }}>Ind.</th>
                    <th style={{ padding: '3px 8px', textAlign: 'left', width: '22%' }}>Result</th>
                    <th style={{ padding: '3px 8px', textAlign: 'left' }}>{isAdmin ? 'Mentor Comments' : 'Programme Feedback'}</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.indicators.map((ind, i) => {
                    const s = domain_scores[ind.id];
                    const result = s?.result === 'pass' ? 'Pass' : s?.result === 'needs_development' ? 'Needs Development' : '—';
                    const resultColor = s?.result === 'pass' ? '#166534' : s?.result === 'needs_development' ? '#b45309' : '#666';
                    return (
                      <tr key={ind.id} style={{ background: i % 2 === 0 ? '#f9fafc' : '#fff', verticalAlign: 'top' }}>
                        <td style={{ padding: '4px 8px', fontWeight: 600, color: '#374151' }}>{ind.id}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 600, color: resultColor }}>
                          {isReview ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Lock style={{ width: 9, height: 9, color: '#9ca3af' }} />
                              {result}
                            </div>
                          ) : result}
                        </td>
                        <td style={{ padding: isReview ? '3px 6px' : '4px 8px', color: '#444' }}>
                          {isReview ? (
                            <textarea
                              value={compComments[ind.id] ?? (s?.comment || '')}
                              onChange={e => setCompComments(prev => ({ ...prev, [ind.id]: e.target.value }))}
                              rows={2}
                              style={{ width: '100%', fontSize: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '3px 6px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                          ) : (compComments[ind.id] ?? s?.comment ?? '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Section 5: Outcome */}
      <div className="section-block">
        <SectionTitle>Assessment Outcome</SectionTitle>
        <div style={{ border: '2px solid #1e5096', borderRadius: 8, padding: '20px 24px', textAlign: 'center', background: '#eff6ff', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>ASSESSMENT OUTCOME</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isReview && <Lock style={{ width: 14, height: 14, color: '#9ca3af' }} title="Locked" />}
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e5096' }}>{competency?.overall_outcome || assignment.result || '—'}</div>
          </div>
        </div>
        {isAdmin ? (
          isReview ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>Printed Name</div>
                <input value={sigName} onChange={e => setSigName(e.target.value)} style={{ width: '100%', fontSize: 12, border: '1.5px solid #fde68a', background: '#fffbeb', borderRadius: 5, padding: '5px 8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>Date</div>
                <input value={sigDate} onChange={e => setSigDate(e.target.value)} style={{ width: '100%', fontSize: 12, border: '1.5px solid #fde68a', background: '#fffbeb', borderRadius: 5, padding: '5px 8px', boxSizing: 'border-box' }} />
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#444' }}>
              Assessed by: <strong>{sigName || assignment.mentor_name || '—'}</strong>
              &nbsp;|&nbsp; Date: <strong>{sigDate}</strong>
              &nbsp;|&nbsp; Signature: _______________________________________________
            </p>
          )
        ) : (
          <p style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>
            This assessment outcome was determined by the SQHN Accreditation Unit — Surveyor Training Certification Program in accordance with established evaluation criteria.
          </p>
        )}
        {competency?.overall_comments && (
          <div style={{ marginTop: 10, background: '#f5f7fa', borderRadius: 6, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#666', marginBottom: 3 }}>OVERALL COMMENTS</p>
            <p style={{ fontSize: 11, color: '#333' }}>{competency.overall_comments}</p>
          </div>
        )}
      </div>

      {/* Section 6: Training Plan */}
      {planItems && planItems.length > 0 && (
        <div className="section-block">
          <SectionTitle>Development Plan Items</SectionTitle>
          <ReportTable
            headers={['Development Area', 'Category', 'Priority', 'Due Date']}
            rows={planItems.map(item => [item.title, item.category || '—', item.priority || '—', item.due_date || '—'])}
          />
        </div>
      )}

      {/* Remedial Plan */}
      {remedialPlan && (isAdmin || remedialPlan.status === 'Active' || remedialPlan.status === 'Completed') && (
        <div className="section-block">
          <SectionTitle>Remedial Development Plan</SectionTitle>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', marginBottom: 6 }}>Status: {remedialPlan.status}</p>
          {(remedialPlan.identified_deficiencies || []).length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Identified Deficiencies</p>
              <ul style={{ paddingLeft: 18, fontSize: 11, color: '#444', marginBottom: 10 }}>
                {remedialPlan.identified_deficiencies.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </>
          )}
          {(remedialPlan.corrective_actions || []).length > 0 && (
            <ReportTable
              headers={['Corrective Action', 'Target Date', 'Status']}
              rows={remedialPlan.corrective_actions.map(ca => [ca.action, ca.target_date || '—', ca.status || '—'])}
            />
          )}
          {remedialPlan.reassessment_date && (
            <p style={{ fontSize: 11, color: '#555', marginTop: 6 }}>Reassessment date: <strong>{remedialPlan.reassessment_date}</strong></p>
          )}
        </div>
      )}

      {/* Session History */}
      {sessions && sessions.length > 1 && (
        <div className="section-block">
          <SectionTitle>Assessment Session History</SectionTitle>
          <ReportTable
            headers={['Session', 'Start Date', 'End Date', 'Status', 'Outcome']}
            rows={sessions.map(s => [`MA ${s.session_number}`, s.start_date || '—', s.end_date || '—', s.status || '—', s.outcome || '—'])}
          />
        </div>
      )}

      {/* Admin Final Observations (admin print only) */}
      {isAdmin && (finalObs || isReview) && (
        <div className="section-block">
          <SectionTitle>Mentor's Final Observations (Admin Record)</SectionTitle>
          {isReview ? (
            <EditableField
              label="Mentor's Final Observations (Admin Record Only — not shown on trainee copy)"
              value={finalObs}
              onChange={setFinalObs}
              rows={4}
            />
          ) : (
            finalObs && <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{finalObs}</p>
          )}
        </div>
      )}

      {/* Signature block (admin print mode only) */}
      {isAdmin && !isReview && (
        <div className="section-block" style={{ marginTop: 24, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <p style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginBottom: 8 }}>MENTOR CERTIFICATION</p>
          <p style={{ fontSize: 11, color: '#444' }}>
            I certify that the above assessment reflects my professional evaluation of the trainee's performance during this Mentored Assessment session.
          </p>
          <div style={{ display: 'flex', gap: 48, marginTop: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: '#666' }}>Printed Name</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{sigName || '—'}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#666' }}>Date</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{sigDate}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: '#666' }}>Signature</p>
              <p style={{ borderBottom: '1px solid #374151', marginTop: 14 }}>&nbsp;</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 8, fontSize: 9, color: '#888', textAlign: 'center', paddingBottom: 24 }}>
        SQHN Accreditation Unit — Surveyor Training Certification Program | Confidential Assessment Document
        {isAdmin && ' | Administrative Record — Not for Distribution to Trainee'}
      </div>
    </div>
  );

  // ── REVIEW MODE layout ───────────────────────────────────────────────────────
  if (isReview) {
    return (
      <>
        <style>{printStyles}</style>
        <div style={{ background: '#fef9c3', borderBottom: '2px solid #facc15', padding: '10px 24px', fontSize: 12, fontWeight: 600, color: '#713f12', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ DRAFT — Review and edit this report before printing. Changes here are for this report only and do not alter the assessment records.
        </div>

        {/* Sticky action bar */}
        <div className="no-print" style={{
          position: 'sticky', top: 0, zIndex: 100, background: '#fff',
          borderBottom: '1px solid #e5e7eb', padding: '10px 24px',
          display: 'flex', gap: 10, alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}>
          <button onClick={handleApproveTrainee} style={{ background: '#1e5096', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            ✓ Approve &amp; Generate Trainee Copy
          </button>
          <button onClick={handleApproveAdmin} style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            🖨 Approve &amp; Print Admin Copy
          </button>
          <button onClick={() => window.close()} style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>Fields with yellow background are editable · 🔒 Locked fields cannot be changed</span>
        </div>

        <div className="report-root" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: 40 }}>
          <div style={{ background: '#fff', maxWidth: 860, margin: '24px auto', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {reportBody}
          </div>
        </div>
      </>
    );
  }

  // ── PRINT / CLEAN MODE layout ────────────────────────────────────────────────
  return (
    <>
      <style>{printStyles}</style>
      <div className="report-root" style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#fff', minHeight: '100vh', paddingBottom: 80 }}>
        {reportBody}
        {/* Sticky bar for non-auto-print (trainee direct access) */}
        <div className="no-print" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
          borderTop: '1px solid #e5e7eb', padding: '12px 24px',
          display: 'flex', gap: 10, justifyContent: 'center',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', zIndex: 100,
        }}>
          <button onClick={() => window.print()} style={{ background: '#1e5096', color: '#fff', padding: '8px 24px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none' }}>
            🖨 Print / Save as PDF
          </button>
          <button onClick={() => window.close()} style={{ background: '#f3f4f6', border: 'none', color: '#374151', padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}