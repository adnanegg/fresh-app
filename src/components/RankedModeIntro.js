import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, database } from "../firebase"; // Import Firebase
import { ref, onValue, update } from "firebase/database"; // Import Firebase database methods
import "bootstrap/dist/css/bootstrap.min.css";

const RankedModeIntro = () => {
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = useState(false); // Track if user has started Ranked Mode

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}/hasStartedRanked`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        setHasStarted(data === true); // Check if user has already started Ranked Mode
      });
    }
  }, []);

  const handleStart = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        hasStartedRanked: true, // Mark user as having started Ranked Mode
      });
      navigate("/ranked-mode/main"); // Navigate to the main Ranked Mode page
    }
  };

  // If user has already started, redirect to main Ranked Mode page
  if (hasStarted) {
    navigate("/ranked-mode/main");
    return null; // Prevent rendering the intro page
  }

  return (
    <div className="container-fluid position-relative" style={{ minHeight: "100vh" }}>
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        className="video-background"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      >
        <source src="/videos/backvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 0,
        }}
      ></div>

      <div className="row" style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <div className="col d-flex align-items-center justify-content-center">
          <div className="text-center text-white" style={{ maxWidth: "800px", padding: "20px" }}>
            <h1 className="display-4 mb-4" style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)" }}>
              Welcome to Ranked Mode!
            </h1>
            <p className="lead mb-5" style={{ textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)" }}>
              Embark on a thrilling journey to rise through the ranks, earn XP, and become a legend! Compete with others, unlock new levels, and showcase your skills in this challenging mode. Are you ready to dominate the leaderboard?
            </p>
            <button
              onClick={handleStart}
              className="btn btn-primary btn-lg px-5 py-3"
              style={{ fontSize: "1.5rem", textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)" }}
            >
              Start
            </button>
            <p className="mt-2 text-muted small" style={{ textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)" }}>
              Note: Once you start, you won’t be able to return to this introduction page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankedModeIntro;