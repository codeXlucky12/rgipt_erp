import React from 'react';

export default function Card({ children, className = '', onClick, hoverable = false }) {
  return (
    <div
      className={`card${hoverable ? ' card--hoverable' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {children}
    </div>
  );
}
