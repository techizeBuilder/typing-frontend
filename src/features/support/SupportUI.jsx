import { useRef, useState } from 'react';
import { PaperclipIcon, XIcon, FileImageIcon, FileVideoIcon, ShieldCheckIcon, UserIcon } from 'lucide-react';
import { resolveAssetUrl } from '../exams/examData';
import { fmtDateTime } from './supportData';

const MAX_FILES = 3;
const LIMITS = { image: 2 * 1024 * 1024, video: 10 * 1024 * 1024 };

// Pick up to 3 images (≤2 MB) or videos (≤10 MB). Same limits the server enforces.
export function AttachmentPicker({ files, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const add = (list) => {
    setError('');
    const next = [...files];
    for (const file of Array.from(list || [])) {
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
      if (!kind) { setError(`${file.name}: only images and videos are allowed.`); continue; }
      if (file.size > LIMITS[kind]) { setError(`${file.name} is too large (max ${kind === 'image' ? '2' : '10'} MB).`); continue; }
      if (next.length >= MAX_FILES) { setError(`You can attach up to ${MAX_FILES} files.`); break; }
      next.push(file);
    }
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-navy-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50">
          <PaperclipIcon className="h-3.5 w-3.5" aria-hidden="true" /> Attach screenshot / video
        </button>
        <span className="text-[11px] text-slate-400">Up to {MAX_FILES} files · images 2 MB · videos 10 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 &&
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11.5px] text-slate-600">
              {f.type.startsWith('video/') ? <FileVideoIcon className="h-3.5 w-3.5" /> : <FileImageIcon className="h-3.5 w-3.5" />}
              <span className="max-w-[160px] truncate">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-danger">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      }
      {error && <p role="alert" className="mt-1.5 text-[11.5px] font-medium text-danger">{error}</p>}
    </div>
  );
}

function AttachmentList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((a, i) => {
        const url = resolveAssetUrl(a.url);
        return a.kind === 'video' ?
          <video key={i} src={url} controls className="max-h-48 max-w-[280px] rounded-md border border-slate-200" /> :
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" title={a.name}>
            <img src={url} alt={a.name} className="max-h-36 max-w-[220px] rounded-md border border-slate-200 object-contain" />
          </a>;
      })}
    </div>
  );
}

// The conversation of a ticket, oldest first. `viewer` decides which side is "you".
export function TicketThread({ replies, viewer }) {
  return (
    <ul className="space-y-3">
      {(replies || []).map((r) => {
        const staff = r.author_type === 'staff';
        const mine = (viewer === 'staff') === staff;
        return (
          <li key={r.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg border px-3.5 py-2.5 ${staff ? 'border-primary-100 bg-primary-50' : 'border-slate-200 bg-white'}`}>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                {staff ? <ShieldCheckIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                {staff ? `${r.author_name || 'Support Team'} · Support Team` : (r.author_name || 'Student')}
                <span className="font-normal text-slate-400">· {fmtDateTime(r.created_at)}</span>
              </p>
              {r.message && <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-navy-800">{r.message}</p>}
              <AttachmentList items={r.attachments} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
