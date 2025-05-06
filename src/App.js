import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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
import AdminScorePage from "./components/AdminScorePage";
import AdminDashboard from "./components/AdminDashboard";

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  // Initialize OneSignal with service worker check
  useEffect(() => {
    const initOneSignal = async () => {
      // Check if OneSignal is already initialized
      if (window.OneSignal?.initialized) {
        console.log("OneSignal already initialized, skipping.");
        return;
      }

      // Check for service worker support
      if (!("serviceWorker" in navigator)) {
        console.error("Service workers are not supported in this browser.");
        return;
      }

      try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.getRegistration(
          "/OneSignalSDKWorker.js"
        );
        if (!registration) {
          console.warn(
            "OneSignal service worker not registered. Attempting registration..."
          );
          await navigator.serviceWorker.register("/OneSignalSDKWorker.js", {
            scope: "/",
          });
        }

        // Initialize OneSignal
        if (!window.OneSignal) {
          console.error("OneSignal SDK not loaded");
          return;
        }

        window.OneSignal.push(function () {
          window.OneSignal.init({
            appId: "fb06cd63-59c3-44cd-951a-14a982e1727d",
            notifyButton: {
              enable: true,
            },
            allowLocalhostAsSecureOrigin: true,
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: "push",
                    autoPrompt: true,
                    text: {
                      actionMessage:
                        "We'd like to send you notifications for the latest updates.",
                      acceptButton: "Allow",
                      cancelButton: "Cancel",
                    },
                    delay: {
                      pageViews: 1,
                      timeDelay: 20,
                    },
                  },
                ],
              },
            },
          });
        });

        // Set initialized flag after a short delay to ensure initialization is complete
        setTimeout(() => {
          window.OneSignal.initialized = true;
          console.log("OneSignal initialized successfully");
        }, 1000);
      } catch (error) {
        console.error("OneSignal initialization failed:", error);
      }
    };

    // Only initialize if OneSignal is available
    if (window.OneSignal) {
      initOneSignal();
    } else {
      console.error("OneSignal SDK not loaded in index.html");
    }

    // Cleanup function
    return () => {
      if (window.OneSignal?.initialized) {
        window.OneSignal.initialized = false;
      }
    };
  }, []);

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
          path="/admin-scores"
          element={
            <PrivateRoute>
              <AdminScorePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute>
              <AdminDashboard />
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

        {/* Default Route */}
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
