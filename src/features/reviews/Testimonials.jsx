import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, QuoteIcon } from 'lucide-react';
import { reviewService } from '../../services/api';
import { StarRating, ReviewAvatar } from './ReviewUI';

const CARD_WIDTH = 356;

// Landing-page testimonials from admin-approved student reviews. Renders
// nothing until at least one review has been approved.
export default function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [index, setIndex] = useState(0);
  const track = useRef(null);

  useEffect(() => {
    reviewService.getPublic()
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, []);

  if (reviews.length === 0) return null;

  const scrollTo = (i) => {
    const clamped = (i + reviews.length) % reviews.length;
    track.current?.scrollTo({ left: clamped * CARD_WIDTH, behavior: 'smooth' });
    setIndex(clamped);
  };

  return (
    <section className="relative mb-4 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-primary-50/50 to-white p-6 shadow-card">
      <h2 className="mb-5 text-center font-display text-[20px] font-bold text-navy-800">What Our Students Say</h2>
      {reviews.length > 1 &&
        <>
          <button type="button" onClick={() => scrollTo(index - 1)} aria-label="Previous reviews"
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white shadow-card transition-colors duration-150 hover:bg-primary hover:text-white">
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scrollTo(index + 1)} aria-label="Next reviews"
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white shadow-card transition-colors duration-150 hover:bg-primary hover:text-white">
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      }
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / CARD_WIDTH))}
        className={`scroll-thin flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 ${reviews.length < 3 ? 'justify-center' : ''}`}>
        {reviews.map((r) => (
          <article key={r.id} className="w-[340px] shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <QuoteIcon className="h-6 w-6 text-rose-300" aria-hidden="true" />
              <StarRating value={r.rating} size="h-3.5 w-3.5" />
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">{r.message}</p>
            <div className="mt-5 flex items-center gap-3">
              <ReviewAvatar name={r.name} photoUrl={r.photo_url} />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold text-navy-800">{r.name}</span>
                <span className="block truncate text-[11.5px] text-slate-500">{r.designation || r.exam}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
