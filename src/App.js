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
      // Check if OneSignal is already initialized or initializing
      if (window.OneSignal?.initialized || window.OneSignal?.isInitializing) {
        console.log("OneSignal already initialized or initializing, skipping.");
        return;
      }

      // Check for service worker support
      if (!("serviceWorker" in navigator)) {
        console.error("Service workers are not supported in this browser.");
        return;
      }

      try {
        // Set initializing flag
        window.OneSignal.isInitializing = true;

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          console.warn(
            "OneSignal service worker not registered. Attempting registration..."
          );
          await navigator.serviceWorker.register("/OneSignalSDKWorker.js", {
            scope: "/",
            updateViaCache: "none",
          });
        }

        // Initialize OneSignal
        if (!window.OneSignal) {
          console.error("OneSignal SDK not loaded");
          return;
        }

        // Only initialize if not already initialized
        if (!window.OneSignal.initialized) {
          await new Promise((resolve, reject) => {
            // Set a timeout to prevent infinite waiting
            const timeout = setTimeout(() => {
              reject(new Error("OneSignal initialization timeout"));
            }, 10000); // 10 second timeout

            window.OneSignal.push(function () {
              window.OneSignal.init({
                appId: "fb06cd63-59c3-44cd-951a-14a982e1727d",
                notifyButton: {
                  enable: true,
                },
                // Configure for both development and production
                allowLocalhostAsSecureOrigin:
                  window.location.hostname === "localhost",
                serviceWorkerPath: "/OneSignalSDKWorker.js",
                serviceWorkerParam: { scope: "/" },
                // Configure prompt options
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
                // Configure for HTTPS
                httpPermissionRequest: {
                  enable: true,
                  useCustomModal: true,
                },
                subdomainName: "dinwadunya",
                origin: "https://dinwadunya-e6d3b.web.app",
                safari_web_id:
                  "web.onesignal.auto.5c2c2c2c-2c2c-2c2c-2c2c-2c2c2c2c2c2c",
                config: {
                  allowedDomains: ["dinwadunya-e6d3b.web.app", "localhost"], // Explicitly allow both domains
                  restrictedOrigins: [],
                },
                // Service worker configuration
                serviceWorkerRegistration: {
                  scope: "/",
                  path: "/OneSignalSDKWorker.js",
                },
              })
                .then(() => {
                  clearTimeout(timeout);
                  window.OneSignal.initialized = true;
                  window.OneSignal.isInitializing = false;
                  console.log("OneSignal initialized successfully");
                  resolve();
                })
                .catch((error) => {
                  clearTimeout(timeout);
                  window.OneSignal.isInitializing = false;
                  reject(error);
                });
            });
          });
        }
      } catch (error) {
        console.error("OneSignal initialization failed:", error);
        window.OneSignal.isInitializing = false;
        // If initialization fails, we should still allow the app to function
        window.OneSignal.initialized = true;
      }
    };

    // Only initialize if OneSignal is available and not already initialized
    if (
      window.OneSignal &&
      !window.OneSignal.initialized &&
      !window.OneSignal.isInitializing
    ) {
      initOneSignal();
    } else {
      console.log(
        "OneSignal initialization skipped - already initialized or not available"
      );
    }

    // Cleanup function
    return () => {
      if (window.OneSignal?.initialized) {
        window.OneSignal.initialized = false;
        window.OneSignal.isInitializing = false;
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
