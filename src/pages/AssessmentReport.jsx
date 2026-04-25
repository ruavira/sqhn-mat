import React, { useEffect, useState } from 'react';
import { getFullAssessmentData } from '@/functions/getFullAssessmentData';
import { getSession } from '@/lib/sqhnSession';
import { SQHN_DOMAINS } from '@/lib/competencyData';
import { Loader2, Printer, ExternalLink } from 'lucide-react';
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

function SectionTitle({ children }) {
  return (
    <div style={{
      background: '#1e5096',
      color: '#fff',
      fontWeight: 700,
      fontSize: 13,
      padding: '6px 12px',
      marginTop: 24,
      marginBottom: 8,
      pageBreakAfter: 'avoid',
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
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: getRowStyle ? getRowStyle(i, row) : (i % 2 === 0 ? '#f9fafc' : '#fff') }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AssessmentReport() {
  const pathParts = window.location.pathname.split('/');
  const assignmentId = pathParts[pathParts.length - 1];
  const params = new URLSearchParams(window.location.search);
  const reportType = params.get('type') || 'trainee';
  const isAdmin = reportType === 'admin';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { window.location.href = '/'; return; }

    getFullAssessmentData({ assignment_id: assignmentId })
      .then(res => {
        if (res.data?.error) { setError(res.data.error); }
        else { setData(res.data); }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [assignmentId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#1e5096' }} />
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

  // ── Standards chapter rollup
  const chapters = {};
  scores.forEach(s => {
    const k = s.chapter_code || 'Other';
    if (!chapters[k]) chapters[k] = { code: s.chapter_code, name: s.chapter_name, items: [] };
    chapters[k].items.push(s);
  });
  const cnt = (items, v) => items.filter(i => i.score === v).length;
  const allAssessed = scores.filter(s => s.score && s.score !== 'N/A');
  const fullyMetPct = allAssessed.length > 0
    ? Math.round((cnt(scores, 'Fully Met') / allAssessed.length) * 100)
    : 0;

  // ── Conferences
  const entrance = conferences.find(c => c.conference_type === 'entrance');
  const exit = conferences.find(c => c.conference_type === 'exit');

  // ── Inline print styles
  const printStyles = `
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; }
      .report-root { padding: 1cm; }
      .section-block { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      @page {
        margin: 1cm;
        @bottom-center {
          content: "SQHN Accreditation Unit — Surveyor Training Certification Program | Page " counter(page) " of " counter(pages);
          font-size: 9px;
          color: #666;
        }
      }
    }
  `;

  const domain_scores = competency?.domain_scores || {};

  return (
    <>
      <style>{printStyles}</style>
      <div className="report-root" style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#fff', minHeight: '100vh', paddingBottom: 80 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 0' }}>

          {/* ── HEADER */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <div style={{
              width: 56, height: 56, background: '#1e5096', borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 1,
            }}>
              SQHN
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1e5096', lineHeight: 1.2 }}>
                Mentored Assessment Tool — Assessment Report
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                Surveyor Training Certification Program
              </div>
            </div>
          </div>

          <div style={{
            background: isAdmin ? '#b91c1c' : '#1e5096',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 11,
            padding: '5px 0',
            borderRadius: 4,
            marginBottom: 20,
            letterSpacing: 1,
          }}>
            {isAdmin ? 'ADMINISTRATIVE RECORD — CONFIDENTIAL' : 'TRAINEE COPY'}
          </div>

          {/* ── SECTION 1: Assessment Details */}
          <div className="section-block">
            <SectionTitle>Assessment Details</SectionTitle>
            <InfoGrid rows={[
              ['Trainee Name', assignment.trainee_name],
              ['Facility', assignment.facility_name],
              ['Facility State', assignment.facility_state],
              ['Assessment Date', fmt(assignment.assessment_date)],
              ['MA Session', `Mentored Assessment Session ${assignment.session_number || 1}`],
              ...(isAdmin ? [
                ['Mentor Name', assignment.mentor_name],
                ['Mentor Email', assignment.mentor_email],
              ] : [
                ['Assessed by', 'SQHN Accreditation Unit — Surveyor Training Certification Program'],
              ]),
              ['Report Generated', fmt(new Date().toISOString())],
            ]} />
          </div>

          {/* ── SECTION 2: Standards Scoring */}
          <div className="section-block">
            <SectionTitle>Standards Assessment Summary</SectionTitle>
            <ReportTable
              headers={['Code', 'Chapter', 'Fully Met', 'Partially Met', 'Not Met', 'N/A', 'Total']}
              rows={[
                ...Object.values(chapters).map(ch => [
                  ch.code, ch.name,
                  cnt(ch.items, 'Fully Met'), cnt(ch.items, 'Partially Met'),
                  cnt(ch.items, 'Not Met'), cnt(ch.items, 'N/A'), ch.items.length,
                ]),
                ['', <strong>TOTAL</strong>,
                  <strong>{cnt(scores, 'Fully Met')}</strong>,
                  <strong>{cnt(scores, 'Partially Met')}</strong>,
                  <strong>{cnt(scores, 'Not Met')}</strong>,
                  <strong>{cnt(scores, 'N/A')}</strong>,
                  <strong>{scores.length}</strong>,
                ],
              ]}
              getRowStyle={(i, row) => i === Object.values(chapters).length ? '#dce6f1' : i % 2 === 0 ? '#f9fafc' : '#fff'}
            />
            <p style={{ fontSize: 11, color: '#444', marginTop: 6 }}>
              Overall compliance rate (Fully Met of assessed): <strong>{fullyMetPct}%</strong>
              &nbsp;|&nbsp; Requirements needing attention: <strong>{cnt(scores, 'Partially Met') + cnt(scores, 'Not Met')}</strong>
            </p>
          </div>

          {/* ── SECTION 3: Conference Assessments */}
          <div className="section-block">
            <SectionTitle>Conference Assessments</SectionTitle>
            {[
              { label: 'Entrance Conference', conf: entrance, agenda: ENTRANCE_AGENDA },
              { label: 'Exit Conference', conf: exit, agenda: EXIT_AGENDA },
            ].map(({ label, conf, agenda }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: '#1e5096', marginBottom: 4 }}>{label}</p>
                {!conf ? (
                  <p style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>Conference not yet completed.</p>
                ) : (
                  <ReportTable
                    headers={['#', 'Agenda Item', 'Rating', isAdmin ? 'Mentor Comments' : 'Comments']}
                    rows={agenda.map((item, idx) => {
                      const a = (conf.mentor_item_assessments || []).find(x => x.item_index === idx);
                      const rating = a?.rating === 'satisfactory' ? 'Satisfactory'
                        : a?.rating === 'needs_improvement' ? 'Needs Improvement' : '—';
                      const ratingEl = (
                        <span style={{ color: a?.rating === 'satisfactory' ? '#166534' : a?.rating === 'needs_improvement' ? '#b45309' : '#666', fontWeight: 600 }}>
                          {rating}
                        </span>
                      );
                      return [idx + 1, item, ratingEl, a?.comment || '—'];
                    })}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ── SECTION 4: Competency Assessment */}
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
                          Domain {domain.id}: {domain.title} &nbsp;
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
                          <tr key={ind.id} style={{ background: i % 2 === 0 ? '#f9fafc' : '#fff' }}>
                            <td style={{ padding: '4px 8px', fontWeight: 600, color: '#374151' }}>{ind.id}</td>
                            <td style={{ padding: '4px 8px', fontWeight: 600, color: resultColor }}>{result}</td>
                            <td style={{ padding: '4px 8px', color: '#444' }}>{s?.comment || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* ── SECTION 5: Outcome */}
          <div className="section-block">
            <SectionTitle>Assessment Outcome</SectionTitle>
            <div style={{
              border: '2px solid #1e5096',
              borderRadius: 8,
              padding: '20px 24px',
              textAlign: 'center',
              background: '#eff6ff',
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
                ASSESSMENT OUTCOME
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e5096' }}>
                {competency?.overall_outcome || assignment.result || '—'}
              </div>
            </div>
            {isAdmin ? (
              <p style={{ fontSize: 11, color: '#444' }}>
                Assessed by: <strong>{assignment.mentor_name || '—'}</strong>
                &nbsp;|&nbsp; Date: <strong>{fmt(competency?.signed_at || assignment.assessment_date)}</strong>
                &nbsp;|&nbsp; Signature: _______________________________________________
              </p>
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

          {/* ── SECTION 6: Training Plan */}
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

          {/* ── SECTION 7: Session History */}
          {sessions && sessions.length > 1 && (
            <div className="section-block">
              <SectionTitle>Assessment Session History</SectionTitle>
              <ReportTable
                headers={['Session', 'Start Date', 'End Date', 'Status', 'Outcome']}
                rows={sessions.map(s => [
                  `MA ${s.session_number}`, s.start_date || '—', s.end_date || '—',
                  s.status || '—', s.outcome || '—',
                ])}
              />
            </div>
          )}

          {/* ── FOOTER */}
          <div style={{
            marginTop: 32,
            borderTop: '1px solid #e5e7eb',
            paddingTop: 8,
            fontSize: 9,
            color: '#888',
            textAlign: 'center',
          }}>
            SQHN Accreditation Unit — Surveyor Training Certification Program | Confidential Assessment Document
            {isAdmin && ' | Administrative Record — Not for Distribution to Trainee'}
          </div>
        </div>

        {/* ── STICKY ACTION BAR (hidden on print) */}
        <div className="no-print" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #e5e7eb',
          padding: '12px 24px', display: 'flex', gap: 10, justifyContent: 'center',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          zIndex: 100,
        }}>
          {isAdmin && (
            <button
              onClick={() => window.open(`/report/${assignmentId}?type=trainee`, '_blank')}
              style={{
                background: '#fff', border: '1.5px solid #1e5096', color: '#1e5096',
                padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <ExternalLink style={{ width: 14, height: 14 }} /> Trainee Copy
            </button>
          )}
          <button
            onClick={() => window.print()}
            style={{
              background: '#1e5096', color: '#fff',
              padding: '8px 24px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, border: 'none',
            }}
          >
            <Printer style={{ width: 14, height: 14 }} />
            {isAdmin ? 'Print Admin Copy' : 'Print / Save as PDF'}
          </button>
          <button
            onClick={() => window.close()}
            style={{
              background: '#f3f4f6', border: 'none', color: '#374151',
              padding: '8px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}