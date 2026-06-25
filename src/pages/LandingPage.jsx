import { useState, useEffect } from 'react';
import Header from '../components/Header';
import ModuleCard from '../components/ModuleCard';
import AboutSection from '../components/AboutSection';
import { settingService } from '../services/api';
import '../App.css';

const LandingPage = () => {
  // Desktop & mobile download links are managed from the Admin Panel (Settings),
  // so the buttons/versions here update automatically whenever the admin saves a
  // new URL — no code change or redeploy required.
  const [apps, setApps] = useState({ desktop: null, mobile: null });

  useEffect(() => {
    (async () => {
      try {
        const all = await settingService.getAll();
        setApps({
          desktop: all?.desktop_app_url
            ? { url: all.desktop_app_url, version: all.desktop_app_version || '', releaseDate: all.desktop_app_release_date || '' }
            : null,
          mobile: all?.mobile_app_url
            ? { url: all.mobile_app_url, version: all.mobile_app_version || '', releaseDate: all.mobile_app_release_date || '' }
            : null,
        });
      } catch (err) {
        // Non-critical: if settings can't load we simply hide the buttons.
        console.warn('Could not load app download info:', err);
      }
    })();
  }, []);

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const meta = (app) =>
    (app.version || app.releaseDate) ? (
      <p className="ddb-meta">
        {app.version && <span>Version <strong>{app.version}</strong></span>}
        {app.version && app.releaseDate && <span> · </span>}
        {app.releaseDate && <span>Released {formatDate(app.releaseDate)}</span>}
      </p>
    ) : null;

  const hasAny = apps.desktop || apps.mobile;

  return (
    <div className="app-container">
      <Header />

      <main className="landing-container">
        {hasAny && (
          <section className="desktop-download-banner">
            <div className="ddb-text">
              <h2 className="ddb-title">Get the App</h2>
              <p className="ddb-sub">
                Install our app to practise typing &amp; steno offline — anytime, anywhere.
              </p>
            </div>

            <div className="ddb-actions">
              {apps.desktop && (
                <div className="ddb-action">
                  {/* External link configured by the admin; opens in a new tab. */}
                  <a className="ddb-btn" href={apps.desktop.url} target="_blank" rel="noopener noreferrer">
                    🖥️ Download Desktop App
                  </a>
                  {meta(apps.desktop)}
                </div>
              )}
              {apps.mobile && (
                <div className="ddb-action">
                  <a className="ddb-btn" href={apps.mobile.url} target="_blank" rel="noopener noreferrer">
                    📱 Download Mobile App
                  </a>
                  {meta(apps.mobile)}
                </div>
              )}
            </div>
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
