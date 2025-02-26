import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Leaderboard from "./components/Leaderboard";
import Profile from "./components/Profile";
import Login from "./components/Login"
import Statistics from "./components/Statistics";
import RankedMode from "./components/RankedMode";
import NormalMode from "./components/NormalMode";
import Signup from "./components/Signup";
import RankedModeIntro from "./components/RankedModeIntro"; // Import the new component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/ranked-mode" element={<RankedModeIntro />} /> {/* Intro page as default */}
        <Route path="/ranked-mode/main" element={<RankedMode />} /> {/* Main Ranked Mode page */}
        <Route path="/normal-mode" element={<NormalMode />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Navigate to="/signup" />} /> {/* Default route */}
      </Routes>
    </Router>
  );
}

export default App;