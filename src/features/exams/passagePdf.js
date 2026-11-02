// "Download PDF" for a test passage: builds a print-ready page and opens the print
// dialog (students pick "Save as PDF"). Same approach as the steno engine's
// passage download — the page's own stylesheets are copied in so the bundled
// Kruti Dev / Mangal @font-face rules render Hindi passages correctly.
import { API_BASE_URL } from '../../config';
import { fontFamilyForChapter } from '../../utils/hindiFonts';

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const assetsBase = API_BASE_URL.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${assetsBase}${url}` : url;
};

function pageCss() {
  let css = '';
  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try { Array.from(sheet.cssRules || []).forEach((rule) => { css += `${rule.cssText}\n`; }); } catch { /* cross-origin sheet */ }
    });
  } catch { /* ignore */ }
  return css;
}

export function buildPassageHtml({ exam, chapter, mode, brand = {} }) {
  const font = fontFamilyForChapter(chapter);
  const title = `${exam?.name || 'Typing Test'} — Test ${chapter?.chapter_no ?? ''}`;
  const name = chapter?.name ? ` · ${chapter.name}` : '';
  const logo = resolveAssetUrl(brand.logoUrl);
  const brandHeader = (brand.name || logo)
    ? `<div class="brand-header">${logo ? `<img src="${escapeHtml(logo)}" alt="" class="brand-logo" />` : ''}${brand.name ? `<span class="brand-name">${escapeHtml(brand.name)}</span>` : ''}</div>`
    : '';
  const words = chapter?.word_count || String(chapter?.content_text || '').trim().split(/\s+/).filter(Boolean).length;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #111; font-family: 'Times New Roman', Times, serif; padding: 32px 40px; }
  ${pageCss()}
  .brand-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #ccc; }
  .brand-logo { width: 44px; height: 44px; object-fit: contain; }
  .brand-name { font-size: 18px; font-weight: 700; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 18px; }
  .passage { ${font ? `font-family: ${font};` : ''} white-space: pre-wrap; font-size: 18px; line-height: 1.9; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style></head>
<body>
  ${brandHeader}
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(`${mode || ''}${name}`)}${exam?.test_time_minutes ? ` · ${exam.test_time_minutes} Minutes` : ''} · ${words} words</div>
  <div class="passage">${escapeHtml(chapter?.content_text || 'No passage text is available for this test.')}</div>
</body></html>`;
}

function openPrintWindow(html) {
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to print or save the passage.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 300);
}

// Desktop: Electron's print window (has "Save as PDF"); web: a print pop-up.
export function downloadPassagePdf(args) {
  const html = buildPassageHtml(args);
  if (window.electronAPI?.printResult) {
    window.electronAPI.printResult(html).catch(() => openPrintWindow(html));
  } else {
    openPrintWindow(html);
  }
}
