// Installers shipped from our own server (public/downloads/ -> dist/downloads/).
// Serving them same-origin is what lets the <a download> attribute work: the
// browser saves the file straight away instead of navigating to a host page.
//
// To publish a new build: drop the file in public/downloads/, then point the
// path below at it. Keep filenames free of spaces so the URL needs no encoding.
// Set an entry to null when we have no file to serve yet.
const INSTALLER = '/downloads/Typing-Exam-Setup-1.1.0-x64.exe';

// Both buttons serve the same installer until a separate mobile build exists.
export const LOCAL_APPS = {
  desktop: INSTALLER,
  mobile: INSTALLER,
};

// Version / release date for the apps we host. The admin can override these from
// Settings; these values keep the caption correct for a locally shipped build
// that nobody has entered metadata for yet.
export const LOCAL_APP_META = {
  desktop: { version: '1.1', releaseDate: '2026-06-22' },
  mobile: { version: '1.0', releaseDate: '2026-06-25' },
};

// Prefer our own copy; fall back to whatever URL the admin saved in Settings.
// Returns null when neither exists, so the caller can hide the button.
export const resolveAppUrl = (kind, adminUrl) => LOCAL_APPS[kind] || adminUrl || null;

// Admin-entered metadata wins; ours fills the gaps. Blank strings count as unset.
export const resolveAppMeta = (kind, adminVersion, adminReleaseDate) => ({
  version: adminVersion || LOCAL_APP_META[kind]?.version || '',
  releaseDate: adminReleaseDate || LOCAL_APP_META[kind]?.releaseDate || '',
});

// The download attribute is only honoured for same-origin URLs. Handing the
// browser a filename for a cross-origin link would silently do nothing, and
// such links (Drive, Play Store) are pages rather than files anyway.
export const isSameOrigin = (url) => Boolean(url) && url.startsWith('/');
