// Query parameter from the hash URL (#/admin/students?new=1). Admin pages are
// remounted whenever the URL changes, so reading it once on mount is enough.
export const urlParam = (key) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(key);
