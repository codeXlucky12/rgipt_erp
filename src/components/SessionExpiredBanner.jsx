import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, LogOut } from 'lucide-react';
import { clearToken } from '../services/api';

export default function SessionExpiredBanner() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('erp:session-expired', handler);
    return () => window.removeEventListener('erp:session-expired', handler);
  }, []);

  if (!visible) return null;

  const handleSignOut = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="session-banner">
      <div className="session-banner__inner">
        <AlertTriangle size={18} className="session-banner__icon" />
        <span className="session-banner__text">
          Your session has expired. Please sign out and log in again.
        </span>
        <button className="session-banner__signout" onClick={handleSignOut}>
          <LogOut size={14} />
          Sign Out
        </button>
        <button className="session-banner__close btn-icon" onClick={() => setVisible(false)} title="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
