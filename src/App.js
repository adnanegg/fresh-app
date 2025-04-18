import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { auth } from "./firebase";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import Login from "./components/Login";
import Statistics from "./components/Statistics";
import GamePage from "./components/GamePage";
import AdminPage from "./components/AdminPage";
import Signup from "./components/Signup";
import NormalModeContainer from "./components/NormalModeContainer";
import WeeklyModeContainer from "./components/WeeklyModeContainer";

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user); // Set to true if user is logged in, false otherwise
    });

    return () => unsubscribe(); // Clean up subscription
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Show loading state while checking auth
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Private Routes (Require Authentication) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <PrivateRoute>
              <Statistics />
            </PrivateRoute>
          }
        />

        <Route
          path="/normal-mode"
          element={
            <PrivateRoute>
              <NormalModeContainer />
            </PrivateRoute>
          }
        />
        <Route
          path="/weekly-mode"
          element={
            <PrivateRoute>
              <WeeklyModeContainer />
            </PrivateRoute>
          }
        />
        <Route
          path="/gamepage"
          element={
            <PrivateRoute>
              <GamePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/adminpage"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />

        {/* Default Route: Redirect unauthenticated users to /login, authenticated to /dashboard */}
        <Route
          path="/"
          element={
            <Navigate to={auth.currentUser ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
