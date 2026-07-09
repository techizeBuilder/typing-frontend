import { useEffect, useState } from 'react';
import './FullscreenToggle.css';

// Floating button (rendered on every route) to enter/exit full-screen mode.
// In the desktop app it drives the Electron window via the preload bridge so
// the taskbar and title bar disappear; when running in a plain browser (dev)
// it falls back to the standard Fullscreen API.
const FullscreenToggle = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.onFullScreenChange) {
      window.electronAPI.isFullScreen().then(({ fullscreen }) => setIsFullscreen(fullscreen));
      return window.electronAPI.onFullScreenChange(setIsFullscreen);
    }
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    if (window.electronAPI?.toggleFullScreen) {
      window.electronAPI.toggleFullScreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <button
      className="fullscreen-toggle"
      onClick={toggle}
      title={isFullscreen ? 'Exit full screen (F11)' : 'Full screen (F11)'}
      aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
    >
      {isFullscreen ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
          <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
          <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
          <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
        </svg>
      )}
    </button>
  );
};

export default FullscreenToggle;
