// "Show Result to Students" timing from the exam's result pattern. A pattern can
// release results at a set India time (e.g. 21:00) on the day of the attempt;
// attempts made after that time are released at that time the next day.
// Display only — scores are calculated and saved exactly as before.

const IST_OFFSET_MIN = 330; // India has no daylight saving

export const timingOf = (pattern) => (pattern ? {
  live_result_mode: pattern.live_result_mode || 'immediate', live_result_time: pattern.live_result_time || '21:00',
  preload_result_mode: pattern.preload_result_mode || 'immediate', preload_result_time: pattern.preload_result_time || '21:00',
} : null);

const isStaff = () => ['Admin', 'SuperAdmin', 'Sub-Admin'].includes(localStorage.getItem('role'));

// When the result becomes visible to the student, or null if it is visible now.
export function resultReleaseAt(timing, testType, takenAt, now = new Date()) {
  if (!timing || isStaff()) return null;
  const live = testType === 'Live Test';
  if ((live ? timing.live_result_mode : timing.preload_result_mode) !== 'scheduled') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(live ? timing.live_result_time : timing.preload_result_time);
  if (!m) return null;
  const taken = takenAt ? new Date(takenAt) : now;
  if (Number.isNaN(taken.getTime())) return null;
  // India calendar date of the attempt, then HH:MM India time on that date.
  const ist = new Date(taken.getTime() + IST_OFFSET_MIN * 60000);
  let release = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), Number(m[1]), Number(m[2])) - IST_OFFSET_MIN * 60000;
  if (taken.getTime() >= release) release += 24 * 60 * 60000;
  return now.getTime() < release ? new Date(release) : null;
}

export const releaseLabel = (d) => d.toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
});
