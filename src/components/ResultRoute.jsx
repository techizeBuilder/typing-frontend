import { useLocation } from 'react-router-dom';
import ResultScreen from '../pages/ResultScreen';
import NotFoundPage from './NotFoundPage';

// The result sheet is built from the navigation state of a finished test (or a
// saved result opened from a list). Opened directly — typed address, refresh in
// the browser — there is nothing to show, so say so instead of an all-zero sheet.
export default function ResultRoute() {
  const { state } = useLocation();
  const hasResult = !!state && (state.gwpm != null || state.nwpm != null);
  return hasResult ? <ResultScreen /> : <NotFoundPage kind="noResult" />;
}
