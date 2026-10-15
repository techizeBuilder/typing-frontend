import { StarIcon } from 'lucide-react';
import { resolveAssetUrl } from '../exams/examData';

// Read-only stars, or a 1–5 picker when `onChange` is given.
export function StarRating({ value = 0, onChange, size = 'h-4 w-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label={onChange ? 'Rating' : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = <StarIcon className={`${size} ${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} aria-hidden="true" />;
        return onChange ?
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange(n)}
            className="rounded transition-transform duration-150 hover:scale-110">
            {star}
          </button> :
          <span key={n}>{star}</span>;
      })}
    </span>
  );
}

// Avatar for a review: the uploaded photo, else the first letter of the name.
export function ReviewAvatar({ name, photoUrl, size = 'h-11 w-11' }) {
  if (photoUrl) {
    return <img src={resolveAssetUrl(photoUrl)} alt="" className={`${size} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-amber-100 font-display text-[15px] font-bold text-navy-800`}>
      {String(name || '?').charAt(0).toUpperCase()}
    </span>
  );
}
