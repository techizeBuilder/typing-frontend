// The games' (visually hidden) text box. It stays empty: each typed character
// goes to onChars (works with physical and on-screen keyboards). Space and
// Enter arrive as ' '; Backspace is reported separately.
export default function TypingInput({ inputRef, onChars, onBackspace, disabled }) {
  return (
    <input
      ref={inputRef}
      aria-label="Type here"
      className="absolute bottom-0 left-0 h-px w-px opacity-0"
      value=""
      onChange={(e) => { if (!disabled && e.target.value) onChars(e.target.value.replace(/\r?\n/g, ' ')); }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Backspace') { e.preventDefault(); onBackspace?.(); }
        if (e.key === 'Enter') { e.preventDefault(); onChars(' '); }
      }}
      onPaste={(e) => e.preventDefault()}
      disabled={disabled}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false} />
  );
}
