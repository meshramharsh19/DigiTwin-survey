import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserLogin from './Components/Authentication/JavaScript/UserLogin';
import GISSurveyorSignup from './Components/Authentication/JavaScript/SignUp';
import Map from './Components/MapAndForms/JavaScript/map';

import { AuthProvider, useAuth } from './Components/Authentication/JavaScript/AuthContext';
import ProtectedRoute from './Components/Authentication/JavaScript/ProtectedRoute';

function AppRoutes() {
  const { authLoading } = useAuth();

  // ⛔ Prevent route rendering until auth is resolved
  if (authLoading) {
    return null; // or a loader
  }

  return (
    <Routes>
      <Route path="/" element={<UserLogin />} />
      <Route path="/signup" element={<GISSurveyorSignup />} />

      {/* 🔐 Protected Map Route */}
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Map />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
