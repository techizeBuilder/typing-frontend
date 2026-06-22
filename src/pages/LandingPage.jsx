import { useState, useEffect } from 'react';
import Header from '../components/Header';
import ModuleCard from '../components/ModuleCard';
import AboutSection from '../components/AboutSection';
import { settingService } from '../services/api';
import { API_BASE_URL } from '../config';
import '../App.css';

const LandingPage = () => {
  // Desktop-app download info is managed from the Admin Panel (Settings), so the
  // button/version here update automatically whenever a new build is uploaded.
  const [appInfo, setAppInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await settingService.getAll();
        if (all && all.desktop_app_url) {
          setAppInfo({
            version: all.desktop_app_version || '',
            releaseDate: all.desktop_app_release_date || '',
          });
        }
      } catch (err) {
        // Non-critical: if settings can't load we simply hide the button.
        console.warn('Could not load desktop app info:', err);
      }
    })();
  }, []);

  // Hit the backend download route so the .exe streams as an attachment and
  // begins downloading immediately (with its friendly filename).
  const downloadHref = `${API_BASE_URL}/settings/desktop-app/download`;

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="app-container">
      <Header />

      <main className="landing-container">
        {appInfo && (
          <section className="desktop-download-banner">
            <div className="ddb-text">
              <h2 className="ddb-title">Get the Desktop Application</h2>
              <p className="ddb-sub">
                Install the Windows app to practise typing &amp; steno offline — no internet required.
              </p>
              {(appInfo.version || appInfo.releaseDate) && (
                <p className="ddb-meta">
                  {appInfo.version && <span>Version <strong>{appInfo.version}</strong></span>}
                  {appInfo.version && appInfo.releaseDate && <span> · </span>}
                  {appInfo.releaseDate && <span>Released {formatDate(appInfo.releaseDate)}</span>}
                </p>
              )}
            </div>
            <a className="ddb-btn" href={downloadHref} download>
              ⬇ Download Desktop Application
            </a>
          </section>
        )}

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
