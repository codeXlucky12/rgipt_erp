import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  LogOut,
  Moon,
  Sun,
  GraduationCap,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { clearToken, getToken } from '../services/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'Profile' },
];

function getInitials() {
  try {
    const raw = localStorage.getItem('erp_auth_token') || '';
    // Try base64 decode the middle part of JWT
    const parts = raw.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const name = payload.name || payload.username || payload.sub || '';
      return name.substring(0, 2).toUpperCase() || 'U';
    }
  } catch {}
  return 'U';
}

export default function Sidebar({ darkMode, onToggleDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const initials = getInitials();

  const SidebarContent = () => (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      {/* Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <GraduationCap size={20} />
          </div>
          <span>RGIPT ERP</span>
        </div>
        <button className="sidebar__close btn-icon" onClick={() => setIsOpen(false)}>
          <X size={20} />
        </button>
      </div>

      {/* User avatar */}
      <div className="sidebar__user">
        <div className="sidebar__avatar">{initials}</div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-label">Student Portal</span>
          <span className="sidebar__user-sub">RGIPT, Rae Bareli</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar__nav">
        <p className="sidebar__nav-section">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
            onClick={() => setIsOpen(false)}
          >
            <span className="sidebar__nav-icon"><Icon size={18} /></span>
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar__nav-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <button className="sidebar__nav-item btn-reset sidebar__theme-btn" onClick={onToggleDark} title="Toggle dark mode">
          <span className="sidebar__nav-icon">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button className="sidebar__nav-item btn-reset sidebar__logout" onClick={handleLogout}>
          <span className="sidebar__nav-icon"><LogOut size={18} /></span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar__hamburger btn-icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      <SidebarContent />

      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar__overlay" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
