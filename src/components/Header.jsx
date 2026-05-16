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
          <img
            src="/clean_building 2.png"
            alt="Building"
            className="parliament-svg"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
