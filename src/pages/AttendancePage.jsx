import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Loader2, AlertCircle, X } from 'lucide-react';
import { fetchErpPage } from '../services/api';
import { parseAttendance } from '../utils/parsers';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ERP_COURSES_URL = 'https://rgipterp.com/erp/bsstums/rgipt_course.php';

const SUBJECT_COLORS = [
  { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#e0f2fe', border: '#06b6d4', text: '#0e7490' },
  { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  { bg: '#fef9c3', border: '#eab308', text: '#713f12' },
];

/** Parse an attendance-report.php HTML page and return stats + absent quiz list */
function parseAttendanceReport(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // ── Summary stats ─────────────────────────────────────
  // The ERP renders stats in .col-lg-3 divs with a <label> then a text node
  // e.g. <div class="col-lg-3"><label>Present</label> 14 </div>
  let totalQuiz = 0, present = 0, absent = 0, pct = null;

  // Try .col-lg-3 approach first
  const statCols = doc.querySelectorAll('.col-lg-3');
  statCols.forEach(col => {
    const label = col.querySelector('label');
    if (!label) return;
    const key = label.textContent.trim().toLowerCase();
    // Get the text node after the label
    const valText = col.textContent.replace(label.textContent, '').trim();
    const num = parseFloat(valText);
    if (key.includes('total quiz')) totalQuiz = num || 0;
    else if (key === 'present') present = num || 0;
    else if (key === 'absent') absent = num || 0;
    else if (key.includes('attendance')) pct = valText; // e.g. "60.87%"
  });

  // Fallback: try .stat-val divs
  if (!totalQuiz && !present) {
    const vals = doc.querySelectorAll('.stat-val');
    // order: totalQuiz, present, absent, pct
    if (vals[0]) totalQuiz = parseInt(vals[0].textContent) || 0;
    if (vals[1]) present = parseInt(vals[1].textContent) || 0;
    if (vals[2]) absent = parseInt(vals[2].textContent) || 0;
    if (vals[3]) pct = vals[3].textContent.trim();
  }

  // Compute pct if not found
  if (!pct && (present + absent > 0)) {
    pct = Math.round((present / (present + absent)) * 100) + '%';
  }

  // ── Absent Test List ──────────────────────────────────
  // The ERP renders this in table.custom-table with thead: #|Test Title|Test Date
  // and tbody rows: <td>1</td><td>Quiz-1 (13-01-26)</td><td>13-01-2026</td>
  const absentRows = [];
  const customTable = doc.querySelector('table.custom-table');
  if (customTable) {
    const tRows = customTable.querySelectorAll('tbody tr');
    tRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        absentRows.push({
          num: cells[0].textContent.trim(),
          title: cells[1].textContent.trim(),
          date: cells[2].textContent.trim(),
        });
      }
    });
  }

  return { totalQuiz, present, absent, pct, absentRows };
}


function AttendanceModal({ course, color, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!course.attLink) { setState({ loading: false, error: 'No attendance link available.', data: null }); return; }
    const url = `https://rgipterp.com/erp/bsstums/${course.attLink}`;
    fetchErpPage(url)
      .then(html => {
        const data = parseAttendanceReport(html);
        setState({ loading: false, error: null, data });
      })
      .catch(err => setState({ loading: false, error: err.message, data: null }));
  }, [course]);

  return (
    <div className="att-modal-overlay" onClick={onClose}>
      <div className="att-modal" onClick={e => e.stopPropagation()}>
        <div className="att-modal-header" style={{ borderLeft: `4px solid ${color.border}` }}>
          <div>
            <span className="att-code-badge" style={{ background: color.bg, color: color.text }}>{course.code}</span>
            <p className="att-modal-title">{course.title}</p>
          </div>
          <button className="att-modal-close btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="att-modal-body">
          {state.loading && (
            <div className="loading-container" style={{ padding: '2rem' }}>
              <div className="spinner" />
              <p className="loading-text">Loading attendance…</p>
            </div>
          )}
          {state.error && (
            <div className="att-modal-error">
              <AlertCircle size={20} />
              <span>{state.error}</span>
            </div>
          )}
          {state.data && (
            <>
              {/* Summary stats */}
              <div className="att-modal-summary">
                <div className="att-stat">
                  <span className="att-stat-val" style={{ color: '#10b981' }}>{state.data.present}</span>
                  <span className="att-stat-lbl">Present</span>
                </div>
                <div className="att-stat">
                  <span className="att-stat-val" style={{ color: '#ef4444' }}>{state.data.absent}</span>
                  <span className="att-stat-lbl">Absent</span>
                </div>
                <div className="att-stat">
                  <span className="att-stat-val">{state.data.totalQuiz}</span>
                  <span className="att-stat-lbl">Total Quizzes</span>
                </div>
                {state.data.pct && (
                  <div className="att-stat">
                    <span className="att-stat-val" style={{
                      color: parseFloat(state.data.pct) >= 75 ? '#10b981'
                           : parseFloat(state.data.pct) >= 60 ? '#f59e0b'
                           : '#ef4444'
                    }}>{state.data.pct}</span>
                    <span className="att-stat-lbl">Attendance</span>
                  </div>
                )}
              </div>

              {/* Absent quiz list */}
              {state.data.absentRows.length > 0 ? (
                <>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Absent Test List
                  </p>
                  <div className="att-modal-table-wrap">
                    <table className="att-detail-table">
                      <thead>
                        <tr>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>#</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Test Title</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.data.absentRows.map((row, i) => (
                          <tr key={i} className="att-row-absent">
                            <td>{row.num}</td>
                            <td>{row.title}</td>
                            <td style={{ color: '#ef4444', fontWeight: 600 }}>{row.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="no-data-msg" style={{ color: '#10b981' }}>🎉 No absences recorded!</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function AttendancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(null); // { course, colorIdx }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const html = await fetchErpPage(ERP_COURSES_URL);
        const result = parseAttendance(html);
        if (!result) throw new Error('Session expired');
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading-container"><LoadingSpinner /></div>;
  if (error)   return <ErrorMessage message={error} />;

  const { name, rollNo, semester, courses } = data;

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h1 className="page-title">Course &amp; Attendance</h1>
        <p className="page-subtitle">
          {name} · {rollNo}{semester ? ` · Semester ${semester}` : ''}
        </p>
      </div>

      <div className="attendance-info-banner">
        <BookOpen size={18} />
        <span>Click <strong>View Attendance</strong> on any course to see your detailed attendance log.</span>
      </div>

      <div className="attendance-grid">
        {courses.map((course, i) => {
          const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
          return (
            <Card key={course.code} hover>
              <div className="attendance-card" style={{ borderLeft: `4px solid ${color.border}` }}>
                <div className="att-card-header">
                  <span className="att-code-badge" style={{ background: color.bg, color: color.text }}>
                    {course.code}
                  </span>
                </div>
                <p className="att-course-title">{course.title}</p>
                {course.attLink && (
                  <button
                    className="att-view-btn"
                    style={{ borderColor: color.border, color: color.text }}
                    onClick={() => setOpenModal({ course, colorIdx: i })}
                  >
                    View Attendance
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Inline attendance modal */}
      {openModal && (
        <AttendanceModal
          course={openModal.course}
          color={SUBJECT_COLORS[openModal.colorIdx % SUBJECT_COLORS.length]}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  );
}
