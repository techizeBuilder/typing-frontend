// "Screen 7 — Institute Layout": the exam screen admins design on the Screen
// Layout page. Display options only; the typing engine and grading are shared
// with every other screen. Stored in app settings as `screen_layout` (JSON).
import { useEffect, useSyncExternalStore } from 'react';
import { settingService } from '../../services/api';

export const LAYOUT_POSITIONS = ['Left Top', 'Center Top', 'Right Top', 'Left Bottom', 'Center Bottom', 'Right Bottom'];

export const DEFAULT_LAYOUT = {
  topHeaderTitle: '',
  mainTitle: '',
  subTitle: 'Complete the passage as accurately and as fast as you can.',
  header: { examName: true, mainTitle: true, instruction: true, logo: true, showHideText: true },
  buttons: { fontSize: true, fullScreen: true, pause: true, submit: true },
  candidate: { photo: true, name: true, rollNo: true },
  timerPosition: 'Right Top',
  buttonPosition: 'Center Bottom',
  buttonStyle: 'Modern',
  keyboardSound: 'Off',
  heightUnit: 'pt',
  heights: { header: 52, passage: 150, typing: 120 },
  colors: {
    headerBg: '#0A2E6B',
    headerText: '#FFFFFF',
    bodyBg: '#F5F7FA',
    passageBg: '#FFFBE6',
    typingBg: '#FFFFFF',
    buttonBg: '#0D6EFD',
    buttonText: '#FFFFFF',
    border: '#D9E1EC',
    submitBg: '#198754',
    fontBtnBg: '#F0F4FF',
    fontBtnText: '#0A2E6B',
  },
};

// Panel heights in points.
export const HEIGHT_LIMITS = { header: [10, 250], passage: [10, 250], typing: [10, 250] };
const HEX = /^#[0-9a-f]{6}$/i;

// Saved JSON → full layout. Anything missing or invalid falls back to the default.
export function mergeLayout(raw) {
  let saved = raw;
  if (typeof raw === 'string') {
    try { saved = raw ? JSON.parse(raw) : {}; } catch { saved = {}; }
  }
  saved = saved && typeof saved === 'object' ? saved : {};
  // Layouts saved before heights were in points hold pixels: convert once (1px = 0.75pt).
  if (saved.heights && saved.heightUnit !== 'pt') {
    saved = { ...saved, heights: Object.fromEntries(Object.entries(saved.heights).map(([k, v]) =>
      [k, Number.isInteger(v) && v <= 400 ? Math.max(10, Math.min(250, Math.round(v * 0.75))) : v])) };
  }
  const d = DEFAULT_LAYOUT;
  const pick = (v, ok, fallback) => (ok(v) ? v : fallback);
  const group = (name) => Object.fromEntries(Object.keys(d[name]).map((k) => [k, pick(saved[name]?.[k], (v) => typeof v === 'boolean', d[name][k])]));
  return {
    topHeaderTitle: pick(saved.topHeaderTitle, (v) => typeof v === 'string', d.topHeaderTitle),
    mainTitle: pick(saved.mainTitle, (v) => typeof v === 'string', d.mainTitle),
    subTitle: pick(saved.subTitle, (v) => typeof v === 'string', d.subTitle),
    header: group('header'),
    buttons: group('buttons'),
    candidate: group('candidate'),
    timerPosition: pick(saved.timerPosition, (v) => LAYOUT_POSITIONS.includes(v), d.timerPosition),
    buttonPosition: pick(saved.buttonPosition, (v) => LAYOUT_POSITIONS.includes(v), d.buttonPosition),
    buttonStyle: pick(saved.buttonStyle, (v) => ['Modern', 'Classic'].includes(v), d.buttonStyle),
    keyboardSound: pick(saved.keyboardSound, (v) => ['Off', 'Click 1', 'Click 2'].includes(v), d.keyboardSound),
    heightUnit: 'pt',
    heights: Object.fromEntries(Object.entries(HEIGHT_LIMITS).map(([k, [min, max]]) =>
      [k, pick(saved.heights?.[k], (v) => Number.isInteger(v) && v >= min && v <= max, d.heights[k])])),
    colors: Object.fromEntries(Object.keys(d.colors).map((k) => [k, pick(saved.colors?.[k], (v) => HEX.test(String(v)), d.colors[k])])),
  };
}

// ─── Loader (cached so the desktop app can open Screen 7 offline) ─────────────
const CACHE_KEY = 'screen-layout';
const readCache = () => {
  try { return localStorage.getItem(CACHE_KEY); } catch { return null; }
};
let current = mergeLayout(readCache() || '');
let branding = { name: '', logoUrl: '' };
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snapshot = () => current;

export function setScreenLayout(raw) {
  current = mergeLayout(raw);
  try { localStorage.setItem(CACHE_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

let loaded = false;
export function useScreenLayout() {
  const layout = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    settingService.getAll()
      .then((all) => {
        branding = { name: all?.institute_name || '', logoUrl: all?.institute_logo_url || '' };
        setScreenLayout(all?.screen_layout || '');
      })
      .catch(() => { loaded = false; });
  }, []);
  return { layout, branding };
}

// Short synthesized key click (no audio files needed).
let audioCtx = null;
export function playKeyClick(kind) {
  if (!kind || kind === 'Off') return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = kind === 'Click 2' ? 'triangle' : 'square';
    osc.frequency.value = kind === 'Click 2' ? 520 : 1400;
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch { /* audio unavailable */ }
}
