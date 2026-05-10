import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModuleCard.css';

const getIcon = (type) => {
  if (type === 'typing') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M10 14h4" />
      </svg>
    );
  } else if (type === 'steno') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h16M4 12h16M4 16h16M7 4v16M17 4v16" />
        <rect x="2" y="6" width="20" height="12" rx="2" fill="none" />
        <path d="M8 10h2M14 10h2M11 14h2" />
      </svg>
    );
  } else if (type === 'livetest') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="4" />
        <path d="M8 18h8M12 14v4M6 10a6 6 0 0 1 12 0" />
      </svg>
    );
  }
  return null;
};

const ModuleCard = ({ type, title, description }) => {
  const navigate = useNavigate();

  const handleStart = () => {
    // Store the selected module type so the dashboard can filter content
    localStorage.setItem('moduleType', type); // 'typing' | 'steno' | 'livetest'
    navigate('/login');
  };

  return (
    <div className={`module-card border-${type}`}>
      <div className={`icon-container bg-${type}`}>
        {getIcon(type)}
      </div>
      <h3 className={`title-${type}`}>{title}</h3>
      <p className="description">{description}</p>
      <button className={`btn-start bg-${type}`} onClick={handleStart}>
        Start Module &gt;
      </button>
      <div className={`card-gradient bg-${type}-light`}></div>
    </div>
  );
};

export default ModuleCard;

