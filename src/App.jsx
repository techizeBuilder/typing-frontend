import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import TestEngine from './pages/TestEngine';
import StenoTestEngine from './pages/StenoTestEngine';
import ResultScreen from './pages/ResultScreen';
import MyResults from './pages/MyResults';
import Leaderboard from './pages/Leaderboard';
import StudentProfile from './pages/StudentProfile';
import AvailableTests from './pages/AvailableTests';
import StenoDictations from './pages/StenoDictations';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExams from './pages/admin/AdminExams';
import AdminChapters from './pages/admin/AdminChapters';
import AdminStudents from './pages/admin/AdminStudents';
import AdminMessages from './pages/admin/AdminMessages';
import AdminFlashBanner from './pages/admin/AdminFlashBanner';
import AdminStaff from './pages/admin/AdminStaff';
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Student Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/test" element={<TestEngine />} />
          <Route path="/steno-test" element={<StenoTestEngine />} />
          <Route path="/available-tests" element={<AvailableTests />} />
          <Route path="/steno-dictations" element={<StenoDictations />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/my-tests" element={<MyResults />} />
          <Route path="/results" element={<MyResults />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="exams" element={<AdminExams />} />
            <Route path="content" element={<AdminChapters />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="flash-banner" element={<AdminFlashBanner />} />
            <Route path="staff" element={<AdminStaff />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
