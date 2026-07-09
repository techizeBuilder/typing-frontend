import { useState, useEffect } from 'react';
import Header from '../components/Header';
import ModuleCard from '../components/ModuleCard';
import AboutSection from '../components/AboutSection';
import { settingService } from '../services/api';
import { resolveAppUrl, resolveAppMeta, isSameOrigin } from '../config/appDownloads';
import '../App.css';

const LandingPage = () => {
  // Version & release date are managed from the Admin Panel (Settings) and update
  // without a redeploy. The file itself is served from our own /downloads/ folder
  // (see config/appDownloads.js); the admin URL is only a fallback for apps we
  // don't host ourselves yet.
  const [apps, setApps] = useState({ desktop: null, mobile: null });

  useEffect(() => {
    const build = (kind, all) => {
      const url = resolveAppUrl(kind, all?.[`${kind}_app_url`]);
      if (!url) return null;
      const { version, releaseDate } = resolveAppMeta(
        kind,
        all?.[`${kind}_app_version`],
        all?.[`${kind}_app_release_date`],
      );
      return { url, version, releaseDate };
    };

    (async () => {
      let all = null;
      try {
        all = await settingService.getAll();
      } catch (err) {
        // Non-critical: the locally hosted apps still download, we just lose the
        // version/date captions for them.
        console.warn('Could not load app download info:', err);
      }
      setApps({ desktop: build('desktop', all), mobile: build('mobile', all) });
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

  // Files we host get `download` so the browser saves them without leaving the
  // page. Anything else is an external page and still needs a new tab.
  const downloadButton = (app, label) => {
    const local = isSameOrigin(app.url);
    return (
      <a
        className="ddb-btn"
        href={app.url}
        {...(local
          ? { download: '' }
          : { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {label}
      </a>
    );
  };

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
                  {downloadButton(apps.desktop, '🖥️ Download Desktop App')}
                  {meta(apps.desktop)}
                </div>
              )}
              {apps.mobile && (
                <div className="ddb-action">
                  {downloadButton(apps.mobile, '📱 Download Mobile App')}
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
