import { useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import VerifyEmail from './components/Auth/VerifyEmail';
import Dashboard from './components/Dashboard/Dashboard';
import MyAccount from './components/Profile/MyAccount';
import ChangePassword from './components/Profile/ChangePassword';
import MagicBlog from './components/Desktop/MagicBlog';
import CopyrightSocial from './components/Desktop/CopyrightSocial';
import MagicPages from './components/Desktop/magic-pages/MagicPages';
import ClientDashboard from './components/Clients/ClientDashboard';
import LandingPage from './components/Landing/LandingPage';
import AnimatedBackground from './components/Shared/AnimatedBackground';
import { preloadPopularFonts } from './utils/fontLoader';

// Checks auth at render time so navigation after login always sees the fresh token
function ProtectedRoute({ children }: { children: ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  useEffect(() => {
    preloadPopularFonts();
  }, []);

  return (
    <Router>
      <AnimatedBackground />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/desktop/magic-blog" element={<ProtectedRoute><MagicBlog /></ProtectedRoute>} />
        <Route path="/desktop/copyright-social" element={<ProtectedRoute><CopyrightSocial /></ProtectedRoute>} />
        <Route path="/desktop/magic-pages" element={<ProtectedRoute><MagicPages /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/" element={localStorage.getItem('token') ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;