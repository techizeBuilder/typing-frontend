import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { LOGO_URL, COLLEGE_NAME } from '../ui/brand';

// Centered card layout shared by Login and Signup.
export default function AuthShell({ heading, subheading, backTo = '/', children }) {
  const navigate = useNavigate();

  return (
    <div className="nd flex min-h-screen w-full items-start justify-center bg-canvas px-4 py-8">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="fixed left-4 top-4 z-10 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-navy-800 shadow-card transition-colors duration-150 hover:bg-slate-50">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>

      <div className="w-full max-w-[460px] pt-8 sm:pt-0">
        <div className="mb-6 text-center">
          <img
            src={LOGO_URL}
            alt=""
            className="mx-auto h-16 w-16 rounded-full bg-white object-contain p-[2px] shadow-card" />
          <h1 className="mt-3 font-display text-[19px] font-bold text-navy-800">{COLLEGE_NAME}</h1>
          <p className="mt-1 font-display text-[15px] font-semibold text-[#6D28D9]">{heading}</p>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{subheading}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// Labelled input with a leading icon and optional show/hide toggle, styled per the design.
export function AuthField({ id, label, icon: Icon, required, help, trailing, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-navy-800">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true" />
        {children}
        {trailing}
      </div>
      {help && <p className="mt-1 text-[11px] text-slate-500">{help}</p>}
    </div>
  );
}

export const authInputClass =
  'w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[13px] text-navy-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-primary';
