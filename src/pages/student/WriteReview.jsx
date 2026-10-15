import { useEffect, useRef, useState } from 'react';
import { InfoIcon, CameraIcon, SendIcon, CheckCircle2Icon, XIcon, ClockIcon, BanIcon } from 'lucide-react';
import { reviewService } from '../../services/api';
import { Breadcrumbs } from '../../ui/PageHeading';
import { LoadingState } from '../../features/exams/ExamUI';
import { useExamList } from '../../features/exams/useExamData';
import { StarRating, ReviewAvatar } from '../../features/reviews/ReviewUI';

const MIN_LENGTH = 20;
const MAX_LENGTH = 600;
const PHOTO_LIMIT = 2 * 1024 * 1024;

const STATUS_INFO = {
  Pending: { icon: ClockIcon, tone: 'border-amber-200 bg-amber-50 text-amber-800', text: 'Your review is waiting for admin approval. It will appear on the homepage once approved.' },
  Approved: { icon: CheckCircle2Icon, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', text: 'Your review is approved and shown on the homepage. Editing it will send it for approval again.' },
  Rejected: { icon: BanIcon, tone: 'border-rose-200 bg-rose-50 text-rose-800', text: 'Your review was not approved. You can edit it and submit again.' },
};

const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(msg) ? msg.join(', ') : msg;
};

export default function WriteReview() {
  const { exams } = useExamList();
  const [review, setReview] = useState(undefined); // undefined = loading, null = none yet
  const [form, setForm] = useState({ rating: 0, exam: '', designation: '', message: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);
  const name = localStorage.getItem('name') || localStorage.getItem('username') || 'You';

  useEffect(() => {
    reviewService.getMine()
      .then((r) => {
        setReview(r || null);
        if (r) setForm({ rating: r.rating, exam: r.exam, designation: r.designation || '', message: r.message });
      })
      .catch(() => setReview(null));
  }, []);

  const examOptions = Array.from(new Set(exams.map((e) => e.name))).sort();
  if (form.exam && !examOptions.includes(form.exam) && form.exam !== 'Other') examOptions.unshift(form.exam);

  const pickPhoto = (file) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('The photo must be an image.'); return; }
    if (file.size > PHOTO_LIMIT) { setError('The photo must be 2 MB or smaller.'); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
    setRemovePhoto(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    const message = form.message.trim();
    if (!form.rating) return setError('Please choose a star rating.');
    if (!form.exam) return setError('Please choose your target exam.');
    if (message.length < MIN_LENGTH) return setError(`Please write at least ${MIN_LENGTH} characters.`);
    setSaving(true);
    try {
      const r = await reviewService.saveMine({ ...form, message }, photo, removePhoto);
      setReview(r);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhoto(null);
      setPhotoPreview('');
      setRemovePhoto(false);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not save your review. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (review === undefined) return <div className="nd p-5"><LoadingState>Loading…</LoadingState></div>;

  const status = review ? STATUS_INFO[review.status] : null;
  const savedPhoto = !photo && !removePhoto ? review?.photo_url || null : null;
  const hasPhoto = Boolean(photo || savedPhoto);
  const remaining = MAX_LENGTH - form.message.length;

  return (
    <div className="nd p-3 pb-20 sm:p-5 sm:pb-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div>
            <h2 className="font-display text-[20px] font-bold text-navy-800">{review ? 'Your Review' : 'Write a Review'}</h2>
            <p className="text-[12.5px] text-slate-500">Share your experience and typing progress with other students.</p>
          </div>
          <div className="ml-auto">
            <Breadcrumbs crumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Write a Review' }]} />
          </div>
        </div>

        {status &&
          <p className={`mb-4 flex items-start gap-2.5 rounded-lg border p-3 text-[12.5px] ${status.tone}`}>
            <status.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>{review.status}.</strong> {status.text}</span>
          </p>
        }

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="mb-4 flex items-start gap-2.5 rounded-lg bg-violet-50 p-3 text-[12px] text-violet-700">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Before you post</span>
              An admin checks every review before it appears on the homepage. Once approved, your name, rating, exam,
              review{form.designation ? ', designation' : ''} and photo (if added) are shown publicly.
            </span>
          </p>

          <div className="mb-4">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-navy-800">Your Rating <span className="text-danger">*</span></span>
            <StarRating value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} size="h-7 w-7" />
          </div>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-navy-800">Target Exam <span className="text-danger">*</span></span>
            <select
              value={form.exam}
              onChange={(e) => setForm({ ...form, exam: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-navy-800 outline-none focus:border-primary">
              <option value="">Select the main exam you are preparing for…</option>
              {examOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-navy-800">Designation / Selection <span className="font-normal text-slate-400">(optional)</span></span>
            <input
              value={form.designation}
              maxLength={150}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="e.g. Stenographer, Delhi High Court"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-navy-800 outline-none placeholder:text-slate-400 focus:border-primary" />
          </label>

          <div className="mb-4">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-navy-800">Your Photo <span className="font-normal text-slate-400">(optional)</span></span>
            <div className="flex flex-wrap items-center gap-3">
              {photo ?
                <img src={photoPreview} alt="" className="h-11 w-11 rounded-full object-cover" /> :
                <ReviewAvatar name={name} photoUrl={savedPhoto} />}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-[12.5px] font-medium text-primary hover:border-primary hover:bg-primary-50/40">
                <CameraIcon className="h-4 w-4" aria-hidden="true" /> {hasPhoto ? 'Change photo' : 'Upload a photo'} (JPG/PNG, max 2 MB)
              </button>
              {hasPhoto &&
                <button type="button" onClick={clearPhoto} className="inline-flex items-center gap-1 text-[12px] font-medium text-danger hover:underline">
                  <XIcon className="h-3.5 w-3.5" /> Remove photo
                </button>
              }
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-navy-800">Your Review <span className="text-danger">*</span></span>
            <textarea
              value={form.message}
              maxLength={MAX_LENGTH}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              placeholder="How has practising here helped your speed, accuracy or exam preparation?"
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] text-navy-800 outline-none placeholder:text-slate-400 focus:border-primary" />
            <span className={`mt-1 block text-right text-[11px] ${remaining < 50 ? 'text-amber-600' : 'text-slate-400'}`}>
              {form.message.trim().length < MIN_LENGTH ? `At least ${MIN_LENGTH} characters · ` : ''}{remaining} left
            </span>
          </label>

          {error && <p role="alert" className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
          {saved && <p role="status" className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700"><CheckCircle2Icon className="h-4 w-4" /> Saved. It will appear on the homepage after approval.</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#7C3AED] py-3 text-[13.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#6D28D9] disabled:opacity-60">
            <SendIcon className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : review ? 'Update Review' : 'Post Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
