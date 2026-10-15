// The six built-in font groups. Their identity (value), script handling and
// keyboard are fixed by the typing engine; admins can only describe them and
// switch them on or off (font_group_settings). Facts below are display-only.
import { useEffect, useSyncExternalStore } from 'react';
import { fontGroupService } from '../../services/api';
import { KRUTI_FONT, MANGAL_FONT } from '../../utils/hindiFonts';

export const BUILT_IN_FONT_GROUPS = [
  { value: 'English Typing', code: 'EN-TYPING', language: 'English', kind: 'Typing', fontType: 'Regular', keyboard: 'Standard English (QWERTY)', fontFamily: null, sample: 'The quick brown fox jumps over the lazy dog. 1234567890' },
  { value: 'Hindi Mangal', code: 'HI-MANGAL', language: 'Hindi', kind: 'Typing', fontType: 'Unicode', keyboard: 'Windows InScript / Phonetic (Unicode)', fontFamily: MANGAL_FONT, sample: 'कठिन परिश्रम सफलता की कुंजी है।' },
  { value: 'Hindi Kruti Dev', code: 'HI-KRUTI', language: 'Hindi', kind: 'Typing', fontType: 'Legacy (non-Unicode)', keyboard: 'Remington (Kruti Dev 010)', fontFamily: KRUTI_FONT, sample: 'dfBu ifjJe lQyrk dh dqath gSA' },
  { value: 'Hindi Remington (GAIL)', code: 'HI-GAIL', language: 'Hindi', kind: 'Typing', fontType: 'Remington Gail', keyboard: 'Remington GAIL (mapped by the app)', fontFamily: KRUTI_FONT, sample: 'dfBu ifjJe lQyrk dh dqath gSA' },
  { value: 'Steno English', code: 'ST-EN', language: 'English', kind: 'Steno', fontType: 'Regular', keyboard: 'Standard English (QWERTY)', fontFamily: null, sample: 'Mr. Speaker, Sir, I rise to support the demands of the Ministry.' },
  { value: 'Steno Hindi', code: 'ST-HI', language: 'Hindi', kind: 'Steno', fontType: 'Per dictation (Mangal / Kruti Dev / Remington)', keyboard: 'Set per dictation by the admin', fontFamily: MANGAL_FONT, sample: 'सभापति महोदय, मैं रक्षा मंत्रालय की माँगों का समर्थन करता हूँ।' },
];

export const fontGroupInfo = (value) => BUILT_IN_FONT_GROUPS.find((g) => g.value === value);

// ─── Settings store (public list; cached so the desktop app works offline) ───
const CACHE_KEY = 'font-group-settings';
const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
};
let settings = readCache(); // null until known → everything counts as active
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export function setFontGroupSettings(list) {
  settings = Array.isArray(list) ? list : settings;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

let loading = null;
export function refreshFontGroups() {
  loading = loading || fontGroupService.list()
    .then(setFontGroupSettings)
    .catch(() => { /* offline: keep the cached / default state */ })
    .finally(() => { loading = null; });
  return loading;
}

let fetched = false;
export function useFontGroupSettings() {
  const snap = useSyncExternalStore(subscribe, () => settings);
  useEffect(() => {
    if (!fetched) { fetched = true; refreshFontGroups(); }
  }, []);
  const isActive = (value) => {
    const s = (snap || []).find((g) => g.value === value);
    return s ? s.is_active !== false : true;
  };
  const describe = (value) => (snap || []).find((g) => g.value === value)?.description || '';
  return { settings: snap, isActive, describe };
}
