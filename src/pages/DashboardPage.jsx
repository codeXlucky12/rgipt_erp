import { useState, useEffect } from 'react';
import { BookOpen, User, GraduationCap, Hash } from 'lucide-react';
import { fetchErpPage } from '../services/api';
import { parseCourses } from '../utils/parsers';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ERP_COURSES_URL = 'https://rgipterp.com/erp/bsstums/rgipt_course.php';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <p className="welcome-sub">Roll No: {rollNo}{semester ? ` · Semester ${semester}` : ''}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
      <StatCard icon={User}         label="Name"     value={name}     color="blue"   />
        <StatCard icon={Hash}         label="Roll No"  value={rollNo}   color="purple" />
        <StatCard icon={BookOpen}     label="Courses"  value={courses.length} color="green" />
        {semester && <StatCard icon={GraduationCap} label="Semester" value={`Semester ${semester}`} color="orange" />}
      </div>

      {/* Courses grid */}
      <section className="section">
        <h2 className="section-title">My Enrolled Courses</h2>
        <div className="courses-grid">
          {courses.map((course, i) => (
            <Card key={course.code} hover>
              <div className="course-card-inner">
                <div className="course-color-strip" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div className="course-card-content">
                  <span className="course-code">{course.code}</span>
                  <p className="course-title">{course.title}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
