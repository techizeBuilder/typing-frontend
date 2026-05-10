import React from 'react';
import Header from '../components/Header';
import ModuleCard from '../components/ModuleCard';
import AboutSection from '../components/AboutSection';
import '../App.css';

const LandingPage = () => {
  return (
    <div className="app-container">
      <Header />
      
      <main className="landing-container">
        <div className="cards-wrapper">
          <ModuleCard 
            type="typing" 
            title="TYPING" 
            description="Improve Your Typing Speed & Accuracy With Exam Oriented Software & Practice Tests" 
          />
          <ModuleCard 
            type="steno" 
            title="STENO" 
            description="Learn Shorthand Skills Step-By-Step With Dictations, Exercises & Transcription Practice" 
          />
          <ModuleCard 
            type="livetest" 
            title="LIVE TEST" 
            description="Real-Time Typing & Steno Practice. Participate in Live Tests & Know Your All India Rank" 
          />
        </div>
        
        <AboutSection />
      </main>
    </div>
  );
};

export default LandingPage;
