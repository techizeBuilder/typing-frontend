// "Download PDF" for a test passage: builds a print-ready page and opens the print
// dialog (students pick "Save as PDF"). Same approach as the steno engine's
// passage download — the page's own stylesheets are copied in so the bundled
// Kruti Dev / Mangal @font-face rules render Hindi passages correctly.
// Every page carries the institute's name, logo and a diagonal watermark.
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { settingService } from '../../services/api';
import { fontFamilyForChapter } from '../../utils/hindiFonts';
import { LOGO_URL } from '../../ui/brand';

const DEFAULT_BRAND_NAME = 'Balaji Typing & Steno College';

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const resolveAssetUrl = (url) => {
  if (!url) return '';
  // Only web addresses, embedded images and site paths can reach the PDF page.
  if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
  const assetsBase = API_BASE_URL.replace(/\/api\/?$/, '');
  return url.startsWith('/') ? `${assetsBase}${url}` : url;
};

// The print page has no base URL, so the logo travels inside the HTML.
const logoAsDataUrl = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`logo ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Institute name + logo for downloaded PDFs. Falls back to the bundled identity, so
// the PDF is branded even offline or before the admin has set them.
export function useInstituteBrand() {
  const [brand, setBrand] = useState({ name: DEFAULT_BRAND_NAME, logoUrl: '' });
  useEffect(() => {
    let alive = true;
    const bundled = () => logoAsDataUrl(new URL(LOGO_URL, window.location.href).href).catch(() => '');
    (async () => {
      const all = await settingService.getAll().catch(() => null);
      const custom = resolveAssetUrl(all?.institute_logo_url);
      const logoUrl = custom ? await logoAsDataUrl(custom).catch(() => custom) : await bundled();
      if (alive) setBrand({ name: all?.institute_name || DEFAULT_BRAND_NAME, logoUrl });
    })();
    return () => { alive = false; };
  }, []);
  return brand;
}

export function pageCss() {
  let css = '';
  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try { Array.from(sheet.cssRules || []).forEach((rule) => { css += `${rule.cssText}\n`; }); } catch { /* cross-origin sheet */ }
    });
  } catch { /* ignore */ }
  return css;
}

export const brandCss = `
  html, body { background: #fff !important; }
  .brand-header { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #ccc; }
  .brand-logo { width: 44px; height: 44px; object-fit: contain; }
  .brand-name { font-size: 18px; font-weight: 700; }
  /* position: fixed repeats the watermark on every printed page */
  .brand-watermark { position: fixed; inset: 0; z-index: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .brand-watermark-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; transform: rotate(-35deg); opacity: 0.1; }
  .brand-watermark img { width: 260px; height: 260px; object-fit: contain; }
  .brand-watermark span { font-family: Arial, Helvetica, sans-serif; font-size: 44px; font-weight: 700; white-space: nowrap; color: #0B1F4B; }
  .brand-content { position: relative; z-index: 1; }
`;

export function brandHtml(brand = {}) {
  const logo = resolveAssetUrl(brand.logoUrl);
  const name = brand.name || DEFAULT_BRAND_NAME;
  const img = (cls) => (logo ? `<img src="${escapeHtml(logo)}" alt="" class="${cls}" />` : '');
  return {
    header: `<div class="brand-header">${img('brand-logo')}<span class="brand-name">${escapeHtml(name)}</span></div>`,
    watermark: `<div class="brand-watermark" aria-hidden="true"><div class="brand-watermark-inner">${img('')}<span>${escapeHtml(name)}</span></div></div>`,
  };
}

export function buildPassageHtml({ exam, chapter, mode, brand = {} }) {
  const font = fontFamilyForChapter(chapter);
  const title = `${exam?.name || 'Typing Test'} — Test ${chapter?.chapter_no ?? ''}`;
  const name = chapter?.name ? ` · ${chapter.name}` : '';
  const { header, watermark } = brandHtml(brand);
  const words = chapter?.word_count || String(chapter?.content_text || '').trim().split(/\s+/).filter(Boolean).length;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #111; font-family: 'Times New Roman', Times, serif; padding: 32px 40px; }
  ${pageCss()}
  ${brandCss}
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 18px; }
  .passage { ${font ? `font-family: ${font};` : ''} white-space: pre-wrap; font-size: 18px; line-height: 1.9; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style></head>
<body>
  ${watermark}
  ${header}
  <div class="brand-content">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(`${mode || ''}${name}`)}${exam?.test_time_minutes ? ` · ${exam.test_time_minutes} Minutes` : ''} · ${words} words</div>
    <div class="passage">${escapeHtml(chapter?.content_text || 'No passage text is available for this test.')}</div>
  </div>
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
