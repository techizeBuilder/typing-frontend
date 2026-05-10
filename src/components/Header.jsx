import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="main-header">
      <div className="header-content">
        <div className="logo-container">
          <img src="/balaji logo.jpeg" alt="Balaji Typing College Logo" className="logo-image" />
        </div>
        
        <div className="title-container">
          <h1>BALAJI TYPING & STENO COLLEGE</h1>
          <h2>An Iso Certified & Govt Register Institute</h2>
          <div className="title-divider"></div>
          <p>Empowering Careers, Enhancing Skills</p>
        </div>

        <div className="right-graphics">
          <svg className="parliament-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g fill="rgba(0,0,0,0.05)">
              <rect x="20" y="80" width="60" height="10" />
              <rect x="25" y="75" width="50" height="5" />
              <rect x="30" y="45" width="40" height="30" />
              <path d="M 50 15 C 35 15, 30 45, 30 45 L 70 45 C 70 45, 65 15, 50 15 Z" />
              <rect x="48" y="5" width="4" height="10" />
              <rect x="25" y="50" width="50" height="2" />
              <rect x="35" y="45" width="5" height="30" />
              <rect x="45" y="45" width="5" height="30" />
              <rect x="55" y="45" width="5" height="30" />
              <rect x="65" y="45" width="5" height="30" />
            </g>
          </svg>
        </div>
      </div>
    </header>
  );
};

export default Header;
