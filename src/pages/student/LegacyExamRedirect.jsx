import { Navigate, useLocation } from 'react-router-dom';
import { LIVE, isStenoMode } from '../../features/exams/examData';

// The legacy /available-tests and /steno-dictations pages received
// { selectedMode, testType, selectedExam } via navigation state. Forward any
// such visit to the equivalent new page.
const toApiMode = (mode) =>
  mode === 'English Steno' ? 'Steno English' : mode === 'Hindi Steno' ? 'Steno Hindi' : mode;

export default function LegacyExamRedirect() {
  const { state } = useLocation();
  const exam = state?.selectedExam;
  const mode = toApiMode(state?.selectedMode);
  if (!exam?.id || !mode) return <Navigate to="/dashboard" replace />;

  const q = `?mode=${encodeURIComponent(mode)}`;
  if (state.testType === LIVE) return <Navigate to={`/live-test/exam/${exam.id}${q}`} replace />;
  if (isStenoMode(mode)) return <Navigate to={`/steno/${exam.id}${q}`} replace />;
  return <Navigate to={`/typing-exam/${exam.id}${q}`} replace />;
}
