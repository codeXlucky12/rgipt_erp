import { useState, useEffect } from 'react';
import {
  Mail, Phone, User, Calendar, Droplets, ShieldCheck,
  Users, PhoneCall, Heart, BookOpen, Hash, Tag,
  ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react';
import { fetchErpPage } from '../services/api';
import { parseProfile } from '../utils/parsers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const ERP_PROFILE_URL = 'https://rgipterp.com/erp/bsstums/my-profile.php';

function pctColor(pct) {
  const n = parseFloat(pct);
  if (n >= 75) return '#10b981';
  if (n >= 60) return '#f59e0b';
  return '#ef4444';
}

/** Copyable field component */
function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button className="profile-copy-btn" onClick={copy} title="Copy">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/** A single info row inside a section card */
function InfoRow({ icon: Icon, label, value, color = 'var(--primary)', sensitive }) {
  const [show, setShow] = useState(false);
  if (!value) return null;
  const display = sensitive && !show ? '••••••••••' : value;
  return (
    <div className="prf-info-row">
      <div className="prf-info-icon" style={{ background: color + '18', color }}>
        <Icon size={15} />
      </div>
      <div className="prf-info-body">
        <span className="prf-info-label">{label}</span>
        <div className="prf-info-value-row">
          <span className="prf-info-value">{display}</span>
          {sensitive && (
            <button className="prf-reveal-btn" onClick={() => setShow(p => !p)}>
              {show ? 'Hide' : 'Show'}
            </button>
          )}
          <CopyField value={value} />
        </div>
      </div>
    </div>
  );
}

/** Collapsible section card */
function SectionCard({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="prf-section-card" style={{ '--section-color': color }}>
      <button className="prf-section-header" onClick={() => setOpen(p => !p)}>
        <div className="prf-section-icon" style={{ background: color + '18', color }}>
          <Icon size={17} />
        </div>
        <span className="prf-section-title">{title}</span>
        {open ? <ChevronUp size={16} className="prf-section-chevron" /> : <ChevronDown size={16} className="prf-section-chevron" />}
      </button>
      {open && <div className="prf-section-body">{children}</div>}
    </div>
  );
}

/** Top stat tile */
function StatTile({ label, value, color }) {
  if (!value) return null;
  return (
    <div className="prf-stat-tile" style={{ '--tile-color': color }}>
      <span className="prf-stat-tile__value">{value}</span>
      <span className="prf-stat-tile__label">{label}</span>
    </div>
  );
}

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

  const {
    name, rollNo, email, phone, gender, dob, blood, aadhar,
    father, mother, parentPhone, parentEmail, category, rawFields,
  } = profile;

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Derive age from DOB
  let age = '';
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d)) {
      age = Math.floor((Date.now() - d) / (365.25 * 24 * 3600 * 1000)) + ' yrs';
    }
  }

  // Format DOB nicely
  let dobDisplay = dob;
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d)) dobDisplay = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // Raw fields fallback — only show those not already shown above
  const knownKeys = ['name', 'email', 'contact', 'gender', 'birth', 'blood', 'aadhaar', 'father', 'mother', 'parents', 'categ'];
  const extraFields = Object.entries(rawFields || {}).filter(([k]) =>
    !knownKeys.some(kk => k.toLowerCase().includes(kk))
  );

  return (
    <div className="profile-page">
      {/* ── Hero ── */}
      <div className="prf-hero">
        <div className="prf-hero-avatar">{initials}</div>
        <div className="prf-hero-info">
          <h1 className="prf-hero-name">{name}</h1>
          <p className="prf-hero-roll">{rollNo}</p>
          <div className="prf-hero-badges">
            {gender && <span className="prf-badge prf-badge--cyan">{gender}</span>}
            {blood && <span className="prf-badge prf-badge--red">🩸 {blood}</span>}
            {category && <span className="prf-badge prf-badge--amber">{category}</span>}
            {age && <span className="prf-badge prf-badge--purple">Age {age}</span>}
          </div>
        </div>
        <div className="prf-hero-glow" />
      </div>

      {/* ── Quick stat tiles ── */}
      <div className="prf-stat-tiles">
        <StatTile label="Roll No"   value={rollNo}   color="#6366f1" />
        <StatTile label="DOB"       value={dobDisplay} color="#ec4899" />
        <StatTile label="Gender"    value={gender}   color="#06b6d4" />
        <StatTile label="Blood Group" value={blood}  color="#ef4444" />
        <StatTile label="Category"  value={category} color="#f59e0b" />
      </div>

      {/* ── Section cards ── */}
      <div className="prf-sections">
        {/* Contact */}
        <SectionCard title="Contact Information" icon={Mail} color="#6366f1">
          <InfoRow icon={Mail}      label="Email"   value={email}  color="#6366f1" />
          <InfoRow icon={Phone}     label="Mobile"  value={phone}  color="#06b6d4" />
        </SectionCard>

        {/* Personal */}
        <SectionCard title="Personal Details" icon={User} color="#8b5cf6">
          <InfoRow icon={Calendar}  label="Date of Birth"   value={dobDisplay} color="#ec4899" />
          <InfoRow icon={Droplets}  label="Blood Group"     value={blood}      color="#ef4444" />
          <InfoRow icon={Tag}       label="Category"        value={category}   color="#f59e0b" />
          <InfoRow icon={ShieldCheck} label="Aadhaar Number" value={aadhar}   color="#10b981" sensitive />
        </SectionCard>

        {/* Family */}
        <SectionCard title="Family Details" icon={Users} color="#10b981">
          <InfoRow icon={User}      label="Father's Name"      value={father}      color="#6366f1" />
          <InfoRow icon={Heart}     label="Mother's Name"      value={mother}      color="#ec4899" />
          <InfoRow icon={PhoneCall} label="Parent's Contact"   value={parentPhone} color="#06b6d4" />
          <InfoRow icon={Mail}      label="Parent's Email"     value={parentEmail} color="#f59e0b" />
        </SectionCard>

        {/* Extra fields not shown above */}
        {extraFields.length > 0 && (
          <SectionCard title="Additional Info" icon={BookOpen} color="#94a3b8" defaultOpen={false}>
            {extraFields.map(([k, v]) => (
              <InfoRow key={k} icon={Hash} label={k} value={v} color="#94a3b8" />
            ))}
          </SectionCard>
        )}
      </div>
    </div>
  );
}
