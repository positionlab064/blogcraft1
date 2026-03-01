import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardLayout from './pages/dashboard/Layout';
import GeneratePage from './pages/dashboard/GeneratePage';
import PhotosPage from './pages/dashboard/PhotosPage';
import SeoPage from './pages/dashboard/SeoPage';
import HistoryPage from './pages/dashboard/HistoryPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/generate" replace />} />
            <Route path="generate" element={<GeneratePage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="seo" element={<SeoPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
