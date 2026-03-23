import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  LogOut,
  Moon,
  Sun,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { clearToken } from '../services/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
];

export default function Sidebar({ darkMode, onToggleDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const SidebarContent = () => (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <GraduationCap size={28} />
          <span>ERP Dashboard</span>
        </div>
        <button className="sidebar__close btn-icon" onClick={() => setIsOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
            onClick={() => setIsOpen(false)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__nav-item btn-reset" onClick={onToggleDark} title="Toggle dark mode">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button className="sidebar__nav-item btn-reset sidebar__logout" onClick={handleLogout}>
          <LogOut size={20} />
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
