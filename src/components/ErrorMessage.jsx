import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  const isSessionExpired = message === 'SESSION_EXPIRED' || message?.includes('Session expired');

  return (
    <div className="error-container">
      <AlertCircle size={36} className="error-icon" />
      <h3 className="error-title">
        {isSessionExpired ? 'Session Expired' : 'Something went wrong'}
      </h3>
      <p className="error-message">
        {isSessionExpired
          ? 'Your ERP session has expired. Please log in to the ERP again and refresh.'
          : message || 'An unexpected error occurred.'}
      </p>
      {onRetry && !isSessionExpired && (
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
