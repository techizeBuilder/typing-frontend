// ─── Hindi font resolution ────────────────────────────────────────────────────
// Single source of truth for mapping a chapter's font configuration to a CSS
// font-family. Used by the admin editor, the steno test engine, and the result
// screen so the passage and typing area always render in the exact font the
// admin selected.
//
// Kruti Dev / Remington (GAIL) are legacy glyph fonts (Hindi glyphs mapped to
// ASCII positions) — they MUST render in the bundled 'Kruti Dev 010' font or the
// text shows as raw English characters. Mangal is true Unicode Devanagari.

export const KRUTI_FONT  = "'Kruti Dev 010'";
export const MANGAL_FONT = "'Noto Sans Devanagari', 'Mangal', 'Arial Unicode MS', sans-serif";

// Steno chapter hindi_font_type → CSS font-family. Returns undefined for English
// / unknown so callers fall back to the default editor font.
export function fontFamilyForHindiType(type) {
  if (type === 'KrutiDev' || type === 'RemingtonGail') return KRUTI_FONT;
  if (type === 'Mangal') return MANGAL_FONT;
  return undefined;
}

// font_group string ('Hindi Kruti Dev', 'Hindi Mangal', …) → CSS font-family.
export function fontFamilyForFontGroup(fontGroup) {
  if (fontGroup === 'Hindi Kruti Dev' || fontGroup === 'Hindi Remington (GAIL)' || fontGroup === 'Hindi Remington')
    return KRUTI_FONT;
  if (fontGroup === 'Hindi Mangal') return MANGAL_FONT;
  return undefined;
}

// hindi_font_type → the equivalent non-steno font_group string. Lets steno tests
// reuse the result screen's existing font_group-based rendering.
export function fontGroupForHindiType(type) {
  if (type === 'KrutiDev')      return 'Hindi Kruti Dev';
  if (type === 'RemingtonGail') return 'Hindi Remington (GAIL)';
  if (type === 'Mangal')        return 'Hindi Mangal';
  return null;
}

// Resolve the font-family for any chapter (steno or normal typing). Steno Hindi
// chapters carry hindi_font_type; everything else is keyed off font_group.
export function fontFamilyForChapter(chapter) {
  if (!chapter) return undefined;
  if (chapter.hindi_font_type) return fontFamilyForHindiType(chapter.hindi_font_type);
  return fontFamilyForFontGroup(chapter.font_group);
}
