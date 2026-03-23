import { useState, useEffect } from 'react';
import { fetchErpPage } from '../services/api';
import { parseProfile } from '../utils/parsers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ERP_PROFILE_URL = 'https://rgipterp.com/erp/bsstums/my-profile.php';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const html = await fetchErpPage(ERP_PROFILE_URL);
        const result = parseProfile(html);
        if (!result) throw new Error('Session expired');
        setProfile(result);
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

  const { name, rollNo, semester, programme, branch, batch, email, details } = profile;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Key fields to highlight at the top
  const highlights = [
    { label: 'Roll No', value: rollNo },
    { label: 'Programme', value: programme },
    { label: 'Branch / Dept', value: branch },
    { label: 'Batch', value: batch },
    { label: 'Semester', value: semester },
    { label: 'Email', value: email },
  ].filter(h => h.value);

  return (
    <div className="profile-page">
      {/* Avatar + name card */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-hero-info">
          <h1 className="profile-name">{name}</h1>
          <p className="profile-roll">{rollNo}</p>
          {programme && <p className="profile-programme">{programme}</p>}
        </div>
      </div>

      {/* Highlight tiles */}
      {highlights.length > 0 && (
        <div className="profile-highlights">
          {highlights.map(h => (
            <div key={h.label} className="profile-highlight-tile">
              <span className="highlight-label">{h.label}</span>
              <span className="highlight-value">{h.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full details table */}
      {details.length > 0 && (
        <div className="profile-details-card">
          <h2 className="section-title">All Details</h2>
          <table className="profile-table">
            <tbody>
              {details.map((row, i) => (
                <tr key={i}>
                  <td className="profile-td-key">{row.key}</td>
                  <td className="profile-td-val">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details.length === 0 && (
        <p className="no-data-msg">No detailed profile data found. The ERP profile page may have a different structure.</p>
      )}
    </div>
  );
}
