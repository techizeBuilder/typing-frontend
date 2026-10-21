import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2Icon, ClockIcon } from 'lucide-react';
import ResultScreen from '../pages/ResultScreen';
import NotFoundPage from './NotFoundPage';
import { releaseLabel, resultReleaseAt } from '../features/results/resultTiming';

// The result sheet is built from the navigation state of a finished test (or a
// saved result opened from a list). Opened directly — typed address, refresh in
// the browser — there is nothing to show, so say so instead of an all-zero sheet.
// When the exam's result pattern releases results at a set time, students see a
// "submitted" notice until then.
export default function ResultRoute() {
  const { state } = useLocation();
  const hasResult = !!state && (state.gwpm != null || state.nwpm != null);
  if (!hasResult) return <NotFoundPage kind="noResult" />;
  const releaseAt = resultReleaseAt(state.resultTiming, state.testType, state.date_taken);
  return releaseAt ? <ResultPending releaseAt={releaseAt} examName={state.exam_name} /> : <ResultScreen />;
}

function ResultPending({ releaseAt, examName }) {
  return (
    <div className="nd grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
        <CheckCircle2Icon className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
        <h1 className="mt-3 font-display text-[20px] font-bold text-navy-800">Test submitted</h1>
        {examName && <p className="mt-1 text-[12.5px] text-slate-500">{examName}</p>}
        <p className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-[13px] font-semibold text-primary-700">
          <ClockIcon className="h-4 w-4" aria-hidden="true" /> Your result will be available at {releaseLabel(releaseAt)}
        </p>
        <p className="mt-3 text-[12px] text-slate-500">Your answers are saved. Open My Results after this time to see your score.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/dashboard" className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-semibold text-navy-800 hover:bg-slate-50">Home</Link>
          <Link to="/my-tests" className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700">My Results</Link>
        </div>
      </div>
    </div>
  );
}
