import React from 'react';
import './AboutSection.css';

const AboutSection = () => {
  return (
    <div className="about-section">
      <div className="about-left">
        <div className="about-icon-container">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="20" width="20" height="2" />
            <path d="M4 10v10M8 10v10M12 10v10M16 10v10M20 10v10" />
            <path d="M2 10h20l-10-5-10 5z" />
          </svg>
        </div>
        <div className="about-text">
          <h3>ABOUT THE INSTITUTE</h3>
          <p>
            Balaji Typing & Steno College Is dedicated To Providing Quality Training In Typing, Stenography competitive exam preparation. Our mission is to empower individuals with essential skills for a successful and secure future in government services.
          </p>
        </div>
      </div>
      
      <div className="about-divider"></div>
      
      <div className="about-right">
        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div>
              <h4>Government Recognized</h4>
              <p>Trusted & Approved</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </span>
            <div>
              <h4>Expert Faculty</h4>
              <p>Learn from the Best</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </span>
            <div>
              <h4>Structured Curriculum</h4>
              <p>Well Designed Modules</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </span>
            <div>
              <h4>Progress Tracking</h4>
              <p>Monitor Your Performance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;
