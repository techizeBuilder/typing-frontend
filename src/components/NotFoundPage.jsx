import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, FileQuestionIcon, HomeIcon, LockIcon } from 'lucide-react';

const STAFF = ['Admin', 'SuperAdmin', 'Sub-Admin'];

const COPY = {
  notFound: { icon: FileQuestionIcon, title: 'Page not found', text: 'The page you are looking for does not exist or has moved.' },
  noAccess: { icon: LockIcon, title: 'No access', text: 'Your account does not have access to this section. Ask an Admin to add it to your permissions.' },
  noResult: { icon: FileQuestionIcon, title: 'No result to show', text: 'Results open from a finished test or from My Results. Open your saved results to view one again.' },
};

// Shared "nothing here" screen: unknown addresses, admin sections the user may
// not open, and the result page opened without a result.
export default function NotFoundPage({ kind = 'notFound', inAdmin = false }) {
  const navigate = useNavigate();
  const { icon: Icon, title, text } = COPY[kind] || COPY.notFound;
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const home = !token ? '/' : STAFF.includes(role) ? '/admin' : '/dashboard';
  const card = (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-card">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary"><Icon className="h-7 w-7" aria-hidden="true" /></span>
      <h1 className="mt-4 text-[18px] font-bold text-navy-800">{title}</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{text}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Go Back
        </button>
        {kind === 'noResult' && token && !STAFF.includes(role)
          ? <Link to="/results" className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">My Results</Link>
          : <Link to={inAdmin ? '/admin' : home} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">
            <HomeIcon className="h-4 w-4" aria-hidden="true" /> {inAdmin || STAFF.includes(role) ? 'Admin Dashboard' : token ? 'Dashboard' : 'Home'}
          </Link>}
      </div>
    </div>
  );
  if (inAdmin) return <div className="nd py-10">{card}</div>;
  return <div className="nd grid min-h-screen place-items-center bg-slate-50 p-4">{card}</div>;
}
