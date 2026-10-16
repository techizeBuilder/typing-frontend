import React from 'react';
// HashRouter (not BrowserRouter) so routing works when the packaged desktop app
// is loaded from a file:// URL — BrowserRouter reads window.location.pathname,
// which is the .html file path under file:// and matches no route.
import { HashRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TestEngine from './pages/TestEngine';
import StenoTestEngine from './pages/StenoTestEngine';
import ResultScreen from './pages/ResultScreen';
import MyResults from './pages/MyResults';
import Leaderboard from './pages/Leaderboard';
import StudentProfile from './pages/StudentProfile';
import Home from './pages/student/Home';
import TypingExams from './pages/student/TypingExams';
import ExamTests from './pages/student/ExamTests';
import StenoExams from './pages/student/StenoExams';
import DictationList from './pages/student/DictationList';
import StenoPractice from './pages/student/StenoPractice';
import MyDictations from './pages/student/MyDictations';
import Magazines from './pages/student/Magazines';
import PlanPricing from './pages/student/PlanPricing';
import ReferEarn from './pages/student/ReferEarn';
import TypingGames from './pages/student/TypingGames';
import TypingGamePlay from './pages/student/TypingGamePlay';
import AIDeepAnalysis from './pages/student/AIDeepAnalysis';
import LiveTests from './pages/student/LiveTests';
import LiveTestSlots from './pages/student/LiveTestSlots';
import LegacyExamRedirect from './pages/student/LegacyExamRedirect';
import HowToUse from './pages/student/HowToUse';
import PracticeWords from './pages/student/PracticeWords';
import TopRanks from './pages/student/TopRanks';
import Support from './pages/student/Support';
import AdminSupportTickets from './pages/admin/AdminSupportTickets';
import WriteReview from './pages/student/WriteReview';
import AdminReviews from './pages/admin/AdminReviews';
import ProtectedRoute from './components/ProtectedRoute';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExams from './pages/admin/AdminExams';
import AdminChapters from './pages/admin/AdminChapters';
import AdminFontGroups from './pages/admin/AdminFontGroups';
import AdminScreenLayout from './pages/admin/AdminScreenLayout';
import AdminMagazines from './pages/admin/AdminMagazines';
import AdminPlans from './pages/admin/AdminPlans';
import AdminStudents from './pages/admin/AdminStudents';
import AdminMessages from './pages/admin/AdminMessages';
import AdminFlashBanner from './pages/admin/AdminFlashBanner';
import AdminStaff from './pages/admin/AdminStaff';
import AdminResults from './pages/admin/AdminResults';
import AdminLeaderboard from './pages/admin/AdminLeaderboard';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import SelfAssessmentSetup from './pages/SelfAssessmentSetup';
import FullscreenToggle from './components/FullscreenToggle';

function App() {
  return (
    <HashRouter>
        <FullscreenToggle />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/plans" element={<PlanPricing publicView />} />

          {/* Protected Student Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Pages inside the student shell (sidebar + header) */}
            <Route element={<StudentLayout />}>
              <Route path="/dashboard" element={<Home />} />
              <Route path="/profile" element={<StudentProfile />} />
              <Route path="/typing-exam" element={<TypingExams />} />
              <Route path="/typing-exam/:examId" element={<ExamTests />} />
              <Route path="/english-steno" element={<StenoExams key="english" language="english" />} />
              <Route path="/hindi-steno" element={<StenoExams key="hindi" language="hindi" />} />
              <Route path="/steno/:examId" element={<DictationList />} />
              <Route path="/steno/:examId/practice/:chapterId" element={<StenoPractice />} />
              <Route path="/my-dictations" element={<MyDictations />} />
              <Route path="/pdf/kc-magazines" element={<Magazines key="kc" collection="kc" />} />
              <Route path="/pdf/progressive-magazines" element={<Magazines key="progressive" collection="progressive" />} />
              <Route path="/plan-pricing" element={<PlanPricing />} />
              <Route path="/refer-earn" element={<ReferEarn />} />
              <Route path="/typing-games" element={<TypingGames />} />
              <Route path="/ai-analysis" element={<AIDeepAnalysis />} />
              <Route path="/live-test/typing" element={<LiveTests key="typing" kind="typing" />} />
              <Route path="/live-test/steno" element={<LiveTests key="steno" kind="steno" />} />
              <Route path="/live-test/exam/:examId" element={<LiveTestSlots />} />
              {/* Legacy addresses (navigation-state based) forward to the pages above */}
              <Route path="/available-tests" element={<LegacyExamRedirect />} />
              <Route path="/steno-dictations" element={<LegacyExamRedirect />} />
              <Route path="/my-tests" element={<MyResults />} />
              <Route path="/results" element={<MyResults />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/self-assessment" element={<SelfAssessmentSetup />} />
              <Route path="/how-to-use" element={<HowToUse />} />
              <Route path="/practice-words" element={<PracticeWords />} />
              <Route path="/top-ranks" element={<TopRanks />} />
              <Route path="/support" element={<Support />} />
              <Route path="/write-review" element={<WriteReview />} />
            </Route>

            {/* Full-screen pages: exam engines and the result sheet */}
            <Route path="/test" element={<TestEngine />} />
            <Route path="/steno-test" element={<StenoTestEngine />} />
            <Route path="/typing-games/:gameId" element={<TypingGamePlay />} />
            <Route path="/result" element={<ResultScreen />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="font-groups" element={<AdminFontGroups />} />
              <Route path="screen-layout" element={<AdminScreenLayout />} />
              <Route path="magazines" element={<AdminMagazines />} />
              <Route path="subscription" element={<AdminPlans />} />
              <Route path="content" element={<AdminChapters />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="flash-banner" element={<AdminFlashBanner />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="results" element={<AdminResults />} />
              <Route path="leaderboard" element={<AdminLeaderboard />} />
              <Route path="support" element={<AdminSupportTickets />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
  );
}

export default App;
