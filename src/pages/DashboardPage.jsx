import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, User, GraduationCap, Hash,
  X, AlertCircle, BarChart2, CheckCircle, XCircle,
  ShieldCheck, ShieldAlert, TrendingUp, TrendingDown,
  Calendar, Award,
} from 'lucide-react';
import { fetchErpPage } from '../services/api';
import { parseCourses } from '../utils/parsers';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ERP_COURSES_URL = 'https://rgipterp.com/erp/bsstums/rgipt_course.php';
const THRESHOLD = 75;

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

function pctColor(pct) {
  const n = parseFloat(pct);
  if (isNaN(n)) return '#94a3b8';
  if (n >= THRESHOLD) return '#10b981';
  if (n >= 60) return '#f59e0b';
  return '#ef4444';
}

/**
 * Returns how many classes can be skipped (positive) or
 * how many must be attended (negative) to stay at/reach 75%.
 * formula: skip = floor((present - 0.75*total) / 0.75)
 * need   = ceil((0.75*total - present) / 0.25) ... i.e. attend N more
 */
function calcSkip(present, total) {
  // classes can skip: present - 0.75*(total + x) >= 0 where x = skips
  // => x <= (present/0.75) - total
  const canSkip = Math.floor(present / THRESHOLD * 100 - total);
  return canSkip; // positive = can skip, negative = must attend
}

function calcNeedToAttend(present, total) {
  // need n so that (present+n)/(total+n) >= 0.75
  // present + n >= 0.75*(total + n)
  // present + n >= 0.75*total + 0.75n
  // 0.25n >= 0.75*total - present
  // n >= (0.75*total - present) / 0.25
  const need = Math.ceil((THRESHOLD / 100 * total - present) / (1 - THRESHOLD / 100));
  return Math.max(0, need);
}

/** Parse the attendance-report.php HTML */
function parseAttendanceReport(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let totalQuiz = 0, present = 0, absent = 0, pct = null;

  const statCols = doc.querySelectorAll('.col-lg-3');
  statCols.forEach(col => {
    const label = col.querySelector('label');
    if (!label) return;
    const key = label.textContent.trim().toLowerCase();
    const valText = col.textContent.replace(label.textContent, '').trim();
    const num = parseFloat(valText);
    if (key.includes('total quiz')) totalQuiz = num || 0;
    else if (key === 'present') present = num || 0;
    else if (key === 'absent') absent = num || 0;
    else if (key.includes('attendance')) pct = valText;
  });

  if (!totalQuiz && !present) {
    const vals = doc.querySelectorAll('.stat-val');
    if (vals[0]) totalQuiz = parseInt(vals[0].textContent) || 0;
    if (vals[1]) present = parseInt(vals[1].textContent) || 0;
    if (vals[2]) absent = parseInt(vals[2].textContent) || 0;
    if (vals[3]) pct = vals[3].textContent.trim();
  }

  if (!pct && (present + absent > 0)) {
    pct = ((present / (present + absent)) * 100).toFixed(1) + '%';
  }

  const absentRows = [];
  const customTable = doc.querySelector('table.custom-table');
  if (customTable) {
    customTable.querySelectorAll('tbody tr').forEach(row => {
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

/* ── Skip / Need-to-attend card ────────────────────────── */
function SkipCard({ present, total }) {
  if (!total) return null;
  const skip = calcSkip(present, total);
  const isSafe = skip >= 0;
  const need = isSafe ? 0 : calcNeedToAttend(present, total);

  return (
    <div className={`skip-card skip-card--${isSafe ? 'safe' : 'danger'}`}>
      <div className="skip-card__icon">
        {isSafe ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
      </div>
      <div className="skip-card__body">
        {isSafe ? (
          <>
            <p className="skip-card__headline">
              You can skip <strong>{skip}</strong> more class{skip !== 1 ? 'es' : ''}
            </p>
            <p className="skip-card__sub">and still stay above {THRESHOLD}% attendance</p>
          </>
        ) : (
          <>
            <p className="skip-card__headline">
              Attend <strong>{need}</strong> more class{need !== 1 ? 'es' : ''} in a row
            </p>
            <p className="skip-card__sub">to reach {THRESHOLD}% attendance</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Attendance detail modal ─────────────────────────────── */
function AttendanceModal({ course, color, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!course.attLink) {
      setState({ loading: false, error: 'No attendance link available.', data: null });
      return;
    }
    const url = `https://rgipterp.com/erp/bsstums/${course.attLink}`;
    fetchErpPage(url)
      .then(html => setState({ loading: false, error: null, data: parseAttendanceReport(html) }))
      .catch(err => setState({ loading: false, error: err.message, data: null }));
  }, [course]);

  const pctNum = state.data?.pct ? parseFloat(state.data.pct) : null;
  const isSafe = pctNum !== null && pctNum >= THRESHOLD;

  return (
    <div className="att-modal-overlay" onClick={onClose}>
      <div className="att-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="att-modal-header" style={{ borderLeft: `4px solid ${color.border}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="att-code-badge" style={{ background: color.bg, color: color.text }}>
                {course.code}
              </span>
              {pctNum !== null && (
                <span className={`safety-chip safety-chip--${isSafe ? 'safe' : 'danger'}`}>
                  {isSafe ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                  {isSafe ? 'Safe' : 'At Risk'}
                </span>
              )}
            </div>
            <p className="att-modal-title">{course.title}</p>
          </div>
          <button className="att-modal-close btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="att-modal-body">
          {state.loading && (
            <div className="loading-container" style={{ padding: '2rem' }}>
              <div className="spinner" /><p className="loading-text">Loading attendance…</p>
            </div>
          )}
          {state.error && (
            <div className="att-modal-error"><AlertCircle size={20} /><span>{state.error}</span></div>
          )}
          {state.data && (
            <>
              {/* % hero */}
              {state.data.pct && (
                <div className="att-pct-hero" style={{ color: pctColor(state.data.pct) }}>
                  <span className="att-pct-hero__number">{state.data.pct}</span>
                  <span className="att-pct-hero__label">Attendance</span>
                </div>
              )}

              {/* Progress bar with 75% threshold line */}
              {state.data.pct && (
                <div className="att-progress-wrap" style={{ position: 'relative' }}>
                  <div
                    className="att-progress-fill"
                    style={{
                      width: Math.min(parseFloat(state.data.pct), 100) + '%',
                      background: pctColor(state.data.pct),
                    }}
                  />
                  {/* 75% threshold marker */}
                  <div className="att-threshold-marker" style={{ left: `${THRESHOLD}%` }}>
                    <div className="att-threshold-line" />
                    <span className="att-threshold-label">{THRESHOLD}%</span>
                  </div>
                </div>
              )}

              {/* Skip calculator */}
              <SkipCard present={state.data.present} total={state.data.totalQuiz} />

              {/* Stats row */}
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
                  <span className="att-stat-lbl">Total</span>
                </div>
              </div>

              {/* Absent sessions */}
              {state.data.absentRows.length > 0 ? (
                <>
                  <p className="att-absent-heading">Absent Sessions</p>
                  <div className="att-modal-table-wrap">
                    <table className="att-detail-table">
                      <thead>
                        <tr>
                          {['#', 'Test Title', 'Date'].map(h => (
                            <th key={h} style={{
                              padding: '0.5rem 0.75rem', fontSize: '0.78rem',
                              color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left',
                              borderBottom: '1px solid var(--border)',
                            }}>{h}</th>
                          ))}
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

/* ── Course card ─────────────────────────────────────────── */
function CourseCard({ course, colorIdx, onViewDetail }) {
  const color = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
  const [att, setAtt] = useState(null);
  const [attErr, setAttErr] = useState(false);

  useEffect(() => {
    if (!course.attLink) return;
    setAtt('loading');
    const url = `https://rgipterp.com/erp/bsstums/${course.attLink}`;
    fetchErpPage(url)
      .then(html => setAtt(parseAttendanceReport(html)))
      .catch(() => { setAtt(null); setAttErr(true); });
  }, [course]);

  const pct = att && att !== 'loading' ? att.pct : null;
  const pctNum = pct ? parseFloat(pct) : null;
  const isSafe = pctNum !== null && pctNum >= THRESHOLD;
  const skipVal = (att && att !== 'loading' && pct) ? calcSkip(att.present, att.totalQuiz) : null;

  return (
    <div className="unified-course-card" style={{ borderLeft: `4px solid ${color.border}` }}>
      {/* Header row */}
      <div className="ucc-header">
        <span className="att-code-badge" style={{ background: color.bg, color: color.text }}>
          {course.code}
        </span>
        {att === 'loading' && <span className="ucc-loading-dot" />}
        {pct && (
          <span className="ucc-pct-badge" style={{
            background: pctColor(pct) + '22',
            color: pctColor(pct),
            border: `1px solid ${pctColor(pct)}44`,
          }}>
            {pct}
          </span>
        )}
        {/* Safe / Not Safe chip */}
        {pct && (
          <span className={`safety-chip safety-chip--${isSafe ? 'safe' : 'danger'}`}>
            {isSafe ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
            {isSafe ? 'Safe' : 'At Risk'}
          </span>
        )}
      </div>

      <p className="ucc-title">{course.title}</p>

      {/* Bar + stats */}
      {pct && (
        <>
          {/* Progress bar with 75% marker */}
          <div className="ucc-bar-wrap" style={{ position: 'relative' }}>
            <div className="ucc-bar-fill" style={{ width: Math.min(pctNum, 100) + '%', background: pctColor(pct) }} />
            <div className="ucc-threshold-tick" style={{ left: `${THRESHOLD}%` }} />
          </div>

          <div className="ucc-mini-stats">
            <span style={{ color: '#10b981' }}><CheckCircle size={12} /> {att.present}P</span>
            <span style={{ color: '#ef4444' }}><XCircle size={12} /> {att.absent}A</span>
            <span style={{ color: 'var(--text-muted)' }}>{att.totalQuiz} total</span>
            {skipVal !== null && (
              skipVal >= 0
                ? <span className="ucc-skip-hint ucc-skip-hint--safe">
                    <TrendingDown size={11} /> skip {skipVal}
                  </span>
                : <span className="ucc-skip-hint ucc-skip-hint--danger">
                    <TrendingUp size={11} /> attend {calcNeedToAttend(att.present, att.totalQuiz)} more
                  </span>
            )}
          </div>
        </>
      )}

      {attErr && <p className="ucc-att-err">Could not load attendance</p>}

      {course.attLink && (
        <button
          className="ucc-detail-btn"
          style={{ borderColor: color.border, color: color.text }}
          onClick={() => onViewDetail(course, colorIdx)}
        >
          <BarChart2 size={14} />
          View Detailed Attendance
        </button>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  // Aggregate attendance stats collected from all cards
  const [attStats, setAttStats] = useState({}); // code → { pct, present, total }

  const updateAttStat = useCallback((code, stat) => {
    setAttStats(prev => ({ ...prev, [code]: stat }));
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const html = await fetchErpPage(ERP_COURSES_URL);
        const result = parseCourses(html);
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

  const openModal = useCallback((course, colorIdx) => setModal({ course, colorIdx }), []);

  // Aggregate overview once att stats are collected
  const overview = useMemo(() => {
    const all = Object.values(attStats);
    if (!all.length) return null;
    const safe = all.filter(s => parseFloat(s.pct || 0) >= THRESHOLD).length;
    const atRisk = all.length - safe;
    const avgPct = all.reduce((s, a) => s + parseFloat(a.pct || 0), 0) / all.length;
    return { safe, atRisk, avgPct: avgPct.toFixed(1) };
  }, [attStats]);

  if (loading) return <div className="loading-container"><LoadingSpinner /></div>;
  if (error)   return <ErrorMessage message={error} />;

  const { name, rollNo, semester, courses } = data;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="dashboard-page">
      {/* Welcome banner */}
      <div className="dashboard-welcome">
        <div className="welcome-avatar">{initials}</div>
        <div className="welcome-info">
          <h1 className="welcome-name">Welcome back, {name.split(' ')[0]}! 👋</h1>
          <p className="welcome-sub">
            Roll No: {rollNo}{semester ? ` · Semester ${semester}` : ''}
          </p>
        </div>
        {/* Attendance overview bubble */}
        {overview && (
          <div className="welcome-overview">
            <div className="welcome-overview__item welcome-overview__item--safe">
              <ShieldCheck size={14} />
              <span>{overview.safe} Safe</span>
            </div>
            <div className="welcome-overview__item welcome-overview__item--risk">
              <ShieldAlert size={14} />
              <span>{overview.atRisk} At Risk</span>
            </div>
            <div className="welcome-overview__item">
              <Award size={14} />
              <span>Avg {overview.avgPct}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard icon={User}         label="Name"     value={name}           color="blue"   />
        <StatCard icon={Hash}         label="Roll No"  value={rollNo}         color="purple" />
        <StatCard icon={BookOpen}     label="Courses"  value={courses.length} color="green"  />
        {semester && <StatCard icon={GraduationCap} label="Semester" value={`Semester ${semester}`} color="orange" />}
      </div>

      {/* Legend */}
      <div className="att-legend">
        <span className="att-legend__item att-legend__item--safe"><ShieldCheck size={13} /> Safe ≥ {THRESHOLD}%</span>
        <span className="att-legend__item att-legend__item--danger"><ShieldAlert size={13} /> At Risk &lt; {THRESHOLD}%</span>
        <span className="att-legend__item att-legend__item--bar">
          <span className="att-legend-tick" /> = {THRESHOLD}% threshold line on bars
        </span>
      </div>

      {/* Courses grid */}
      <section className="section">
        <h2 className="section-title">
          <BarChart2 size={18} />
          Courses &amp; Attendance
        </h2>
        <p className="section-subtitle">
          Attendance loads automatically. Click <strong>View Detailed Attendance</strong> for the skip calculator and session log.
        </p>
        <div className="unified-courses-grid">
          {courses.map((course, i) => (
            <CourseCardWithReport
              key={course.code}
              course={course}
              colorIdx={i}
              onViewDetail={openModal}
              onAttLoaded={updateAttStat}
            />
          ))}
        </div>
      </section>

      {modal && (
        <AttendanceModal
          course={modal.course}
          color={SUBJECT_COLORS[modal.colorIdx % SUBJECT_COLORS.length]}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* Wrapper that also reports loaded data upward */
function CourseCardWithReport({ course, colorIdx, onViewDetail, onAttLoaded }) {
  const color = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
  const [att, setAtt] = useState(null);
  const [attErr, setAttErr] = useState(false);

  useEffect(() => {
    if (!course.attLink) return;
    setAtt('loading');
    const url = `https://rgipterp.com/erp/bsstums/${course.attLink}`;
    fetchErpPage(url)
      .then(html => {
        const d = parseAttendanceReport(html);
        setAtt(d);
        if (d.pct) onAttLoaded(course.code, d);
      })
      .catch(() => { setAtt(null); setAttErr(true); });
  }, [course, onAttLoaded]);

  const pct = att && att !== 'loading' ? att.pct : null;
  const pctNum = pct ? parseFloat(pct) : null;
  const isSafe = pctNum !== null && pctNum >= THRESHOLD;
  const skipVal = (att && att !== 'loading' && pct) ? calcSkip(att.present, att.totalQuiz) : null;

  return (
    <div className="unified-course-card" style={{ borderLeft: `4px solid ${color.border}` }}>
      <div className="ucc-header">
        <span className="att-code-badge" style={{ background: color.bg, color: color.text }}>
          {course.code}
        </span>
        {att === 'loading' && <span className="ucc-loading-dot" />}
        {pct && (
          <span className="ucc-pct-badge" style={{
            background: pctColor(pct) + '22',
            color: pctColor(pct),
            border: `1px solid ${pctColor(pct)}44`,
          }}>
            {pct}
          </span>
        )}
        {pct && (
          <span className={`safety-chip safety-chip--${isSafe ? 'safe' : 'danger'}`}>
            {isSafe ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
            {isSafe ? 'Safe' : 'At Risk'}
          </span>
        )}
      </div>

      <p className="ucc-title">{course.title}</p>

      {pct && (
        <>
          <div className="ucc-bar-wrap" style={{ position: 'relative', overflow: 'visible' }}>
            <div className="ucc-bar-fill" style={{ width: Math.min(pctNum, 100) + '%', background: pctColor(pct) }} />
            <div className="ucc-threshold-tick" style={{ left: `${THRESHOLD}%` }} />
          </div>
          <div className="ucc-mini-stats">
            <span style={{ color: '#10b981' }}><CheckCircle size={12} /> {att.present}P</span>
            <span style={{ color: '#ef4444' }}><XCircle size={12} /> {att.absent}A</span>
            <span style={{ color: 'var(--text-muted)' }}>{att.totalQuiz} total</span>
            {skipVal !== null && (
              skipVal >= 0
                ? <span className="ucc-skip-hint ucc-skip-hint--safe">
                    <TrendingDown size={11} /> skip {skipVal}
                  </span>
                : <span className="ucc-skip-hint ucc-skip-hint--danger">
                    <TrendingUp size={11} /> attend {calcNeedToAttend(att.present, att.totalQuiz)} more
                  </span>
            )}
          </div>
        </>
      )}
      {attErr && <p className="ucc-att-err">Could not load attendance</p>}
      {course.attLink && (
        <button
          className="ucc-detail-btn"
          style={{ borderColor: color.border, color: color.text }}
          onClick={() => onViewDetail(course, colorIdx)}
        >
          <BarChart2 size={14} />
          View Detailed Attendance
        </button>
      )}
    </div>
  );
}
