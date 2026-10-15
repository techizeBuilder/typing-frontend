import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

const base64ToBlob = (base64, mime) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

// Audio source for a dictation, resolved the same way as StenoTestEngine:
// the desktop app's offline cache first, else the server (online only).
// Returns { url, ready }; url is null when no audio is reachable.
export function useDictationAudio(chapterId) {
  const [state, setState] = useState({ id: null, url: null });

  useEffect(() => {
    if (!chapterId) return undefined;
    let cancelled = false;
    let blobUrl = null;
    const serverUrl = `${API_BASE_URL}/chapters/${chapterId}/audio`;
    (async () => {
      let url = navigator.onLine ? serverUrl : null;
      try {
        if (window.electronAPI?.hasAudio) {
          const { exists } = await window.electronAPI.hasAudio(chapterId);
          if (exists) {
            const { base64 } = await window.electronAPI.getAudio(chapterId);
            blobUrl = URL.createObjectURL(base64ToBlob(base64, 'audio/mpeg'));
            url = blobUrl;
          }
        }
      } catch { /* fall back to the server URL */ }
      if (!cancelled) setState({ id: chapterId, url });
    })();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [chapterId]);

  return { url: state.id === chapterId ? state.url : null, ready: state.id === chapterId };
}
