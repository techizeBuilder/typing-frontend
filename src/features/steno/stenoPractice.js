// Data and helpers for the steno practice flow (setup page → transcription
// interface). Nothing here grades a test: scoring stays in StenoTestEngine and
// always uses the exam's result pattern set by the institute.

const commonInstructions = (startRule) => [
  "Your mistakes are calculated with this exam's result pattern, set by your institute.",
  'The dictation is not played on this screen. Type the passage from your shorthand notes.',
  'Do not refresh the page during the test.',
  'Click "Submit" once you have finished typing.',
  startRule,
  'The test is submitted automatically when the timer ends.',
];

const onStart = 'The timer starts as soon as you click "Start Test".';
const onFirstKey = 'The timer starts when you begin typing.';

// `variant` picks the screen layout. Durations are the official transcription
// windows; they only control the countdown / auto-submit, not the scoring.
export const TRANSCRIPTION_INTERFACES = [
  {
    id: 'common',
    name: 'Common Interface',
    meta: 'Universal practice mode',
    bg: '#0D6EFD',
    variant: 'common',
    durationMinutes: 50,
    durationOptions: [10, 15, 20, 30, 40, 50, 60],
    instructions: commonInstructions(onStart),
  },
  {
    id: 'ssc-c',
    name: 'SSC Stenographer (Grade C)',
    meta: '40 minutes · SSC exam screen',
    bg: '#0EA5E9',
    variant: 'ssc',
    orgName: 'Staff Selection Commission',
    skillTestTitle: 'SSC Steno Skill Test',
    examTitle: 'SSC Stenographer Grade C Examination',
    durationMinutes: 40,
    instructions: commonInstructions(onStart),
  },
  {
    id: 'ssc-d',
    name: 'SSC Stenographer (Grade D)',
    meta: '50 minutes · SSC exam screen',
    bg: '#0EA5E9',
    variant: 'ssc',
    orgName: 'Staff Selection Commission',
    skillTestTitle: 'SSC Steno Skill Test',
    examTitle: 'SSC Stenographer Grade D Examination',
    durationMinutes: 50,
    instructions: commonInstructions(onStart),
  },
  {
    id: 'patna-hc',
    name: 'Patna High Court',
    meta: '50 minutes · court interface',
    bg: '#6F42C1',
    variant: 'court',
    orgName: 'Patna High Court',
    skillTestTitle: 'Patna HC Steno Skill Test',
    examTitle: 'Patna High Court Stenographer Recruitment',
    durationMinutes: 50,
    instructions: commonInstructions(onStart),
  },
  {
    id: 'supreme',
    name: 'Supreme Court',
    meta: '50 minutes · court interface',
    bg: '#8B5CF6',
    variant: 'court',
    orgName: 'Supreme Court of India',
    skillTestTitle: 'Supreme Court Steno Skill Test',
    examTitle: 'Supreme Court Stenographer Examination',
    durationMinutes: 50,
    instructions: commonInstructions(onStart),
  },
  {
    id: 'ahc',
    name: 'Allahabad High Court',
    meta: '30 minutes · court interface',
    bg: '#0D6EFD',
    variant: 'court',
    orgName: 'Allahabad High Court',
    skillTestTitle: 'Allahabad HC Steno Skill Test',
    examTitle: 'Allahabad High Court Stenographer Examination',
    durationMinutes: 30,
    instructions: commonInstructions(onStart),
  },
  {
    id: 'hssc',
    name: 'HSSC Stenographer',
    meta: '20 minutes · Haryana SSC screen',
    bg: '#10B981',
    variant: 'hssc',
    orgName: 'Haryana Staff Selection Commission',
    skillTestTitle: 'Stenographer Skill Test',
    examTitle: 'HSSC Stenographer Examination',
    durationMinutes: 20,
    instructions: commonInstructions(onStart),
  },
  {
    id: 'dsssb',
    name: 'D.S.S.S.B.',
    meta: '30–50 minutes · D.S.S.S.B. screen',
    bg: '#0EA5E9',
    variant: 'dsssb',
    orgName: 'Delhi Subordinate Services Selection Board',
    skillTestTitle: 'DSSSB Shorthand Skill Test',
    examTitle: 'DSSSB Stenographer Shorthand Skill Test',
    durationMinutes: 40,
    durationOptions: [30, 35, 40, 45, 50],
    instructions: commonInstructions(onStart),
  },
  {
    id: 'capf',
    name: 'CAPF ASI Stenographer',
    meta: '50 min English · 65 min Hindi',
    bg: '#166534',
    variant: 'capf',
    orgName: 'Central Armed Police Forces',
    skillTestTitle: 'CAPF ASI Stenographer Skill Test',
    examTitle: 'CAPF Assistant Sub-Inspector (Stenographer) Examination',
    durationMinutes: 50,
    hindiDurationMinutes: 65,
    instructions: commonInstructions(onFirstKey),
  },
];

// The original steno engine screen (audio player, replay, live speed). Kept as
// an option so no existing practice feature is lost.
export const CLASSIC_INTERFACE = {
  id: 'classic',
  name: 'Classic Practice',
  meta: 'Audio player, replay & live speed',
  bg: '#0A2E6B',
};

export const findInterface = (id) => TRANSCRIPTION_INTERFACES.find((i) => i.id === id) || null;

export const interfaceMinutes = (iface, isHindi) =>
  (isHindi && iface.hindiDurationMinutes) || iface.durationMinutes;

// Dictation speeds offered around the admin-set default. Playback rate is
// speed / default, kept between 0.6× and 1.6× so the audio stays intelligible.
export const speedChoices = (defaultSpeed) => {
  const min = Math.max(30, Math.ceil((defaultSpeed * 0.6) / 5) * 5);
  const max = Math.floor((defaultSpeed * 1.6) / 5) * 5;
  const out = [];
  for (let s = min; s <= max; s += 5) out.push(s);
  if (!out.includes(defaultSpeed)) out.push(defaultSpeed);
  return out.sort((a, b) => a - b);
};

export const FLUCTUATIONS = [
  { value: 0, label: 'Off' },
  { value: 0.05, label: 'Low (±5%)' },
  { value: 0.1, label: 'Medium (±10%)' },
  { value: 0.15, label: 'High (±15%)' },
];

// Same whitespace tokenisation the engine uses for grading.
export const passageWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);

// Word-length choice → { start, end } (0-based, inclusive) or null for full length.
export const FIRST_N = [100, 200, 400, 600];

export const rangeLabel = (range) => {
  if (!range) return 'Full Length';
  if (range.start === 0) return `First ${range.end + 1} words`;
  return `Words ${range.start + 1}–${range.end + 1} (${range.end - range.start + 1} words)`;
};

export const clampRange = (start, end, total) => {
  const s = Math.max(0, Math.min(start, end, total - 1));
  const e = Math.min(total - 1, Math.max(start, end));
  if (s === 0 && e === total - 1) return null;
  return { start: s, end: e };
};

// "Seen" mark is a per-device study aid, keyed by student and dictation.
const seenKey = (chapterId) => `steno-seen:${localStorage.getItem('userId') || 'guest'}:${chapterId}`;
export const isSeen = (chapterId) => {
  try { return localStorage.getItem(seenKey(chapterId)) === '1'; } catch { return false; }
};
export const setSeen = (chapterId, seen) => {
  try {
    if (seen) localStorage.setItem(seenKey(chapterId), '1');
    else localStorage.removeItem(seenKey(chapterId));
  } catch { /* storage unavailable */ }
};
