import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleDark = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <div className={`app-shell${darkMode ? ' dark' : ''}`} data-theme={darkMode ? 'dark' : 'light'}>
      <Sidebar darkMode={darkMode} onToggleDark={toggleDark} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
