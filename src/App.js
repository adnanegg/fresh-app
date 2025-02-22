// import { useEffect, useState } from "react";
import { auth } from "./firebase";
// import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Leaderboard from "./components/Leaderboard";
import Profile from "./components/Profile"
import Statistics from "./components/Statistics";
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
  const user = auth.currentUser; // Check if the user is logged in

  return (
    <Router>
      <Routes>
        {/* Redirect to Signup if the user is not logged in */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <Navigate to="/signup" />}
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </Router>
  );
};

export default App;
