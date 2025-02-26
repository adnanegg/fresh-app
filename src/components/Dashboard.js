import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import Swal from "sweetalert2";
// import "./styles/Dashboard.css"; // Reuse Dashboard styling
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Ranking configuration
const rankingConfig = {
  thresholds: [20000, 100000, 300000, 500000, 1000000],
  ranks: ["Warrior", "Master", "Grand Master", "Legend", "Mythic"],
  images: [
    "ranking-images/rank-warrior.png",
    "ranking-images/rank-master.png",
    "ranking-images/rank-grandmaster.png",
    "ranking-images/rank-legend.png",
    "ranking-images/rank-mythic.png",
  ],
  levelUpMessages: [
    "Warrior status unlocked! Your journey blazes with strength and courage!",
    "You did it! As a Master, your name now sparks awe and respect!",
    "Grand Master achieved! You wield power and wisdom like a true champion!",
    "Legend mode: activated! Your deeds are etched into the chronicles of greatness!",
    "Mythic rank reached! You've become a living legend—an icon of the ages!"
  ],
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "profile-images/default-profile.png",
    rankName: "Warrior",
    rankImage: "ranking-images/rank-warrior.png"
  });
  const [xpData, setXpData] = useState({ current: 0, level: 1 });
  const [pointsData, setPointsData] = useState({ current: 0, total: 900 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 3000 });
  const [hasStartedRanked, setHasStartedRanked] = useState(false); // Track if user started Ranked Mode
  const [isLoading, setIsLoading] = useState(true); // Add isLoading state
  const [formType, setFormType] = useState("weekly"); // "weekly" or "monthly"
  const [formData, setFormData] = useState({
    nickname: "",
    message: ""
  });

  // Check if the user is authenticated and fetch data
  useEffect(() => {
    let unsubscribe;

    const fetchUserData = async (userId) => {
      setIsLoading(true); // Start loading
      const userRef = ref(database, `users/${userId}`);
      unsubscribe = onValue(userRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserProfile(data.profile || { name: "User", photo: "/profile-photos/default-profile.png" });
          setXpData(data.xp || { current: 0, level: 1 });
          setPointsData(data.points || { current: 0, total: 900 });
          setMpointsData(data.Mpoints || { current: 0, total: 3000 });
          setFormData(prev => ({ ...prev, nickname: data.profile?.name || "" }));
          setHasStartedRanked(data.hasStartedRanked || false); // Fetch hasStartedRanked from Firebase

          const userXp = data.xp?.current || 0;
          const currentLevel = data.xp?.level || 1;

          if (hasStartedRanked && userXp >= (rankingConfig.thresholds[currentLevel - 1] || 100)) {
            const newLevel = currentLevel + 1;
            const newRankIndex = rankingConfig.thresholds.findIndex((threshold) => userXp < threshold);

            if (newRankIndex !== -1) {
              const newRank = rankingConfig.ranks[newRankIndex];
              const newRankImage = rankingConfig.images[newRankIndex];

              await update(userRef, {
                "profile/rankName": newRank,
                "profile/rankImage": newRankImage,
                "xp/level": newLevel,
                "xp/current": userXp - rankingConfig.thresholds[currentLevel - 1],
              });

              Swal.fire({
                title: "Level Up!",
                text: rankingConfig.levelUpMessages[newRankIndex] || "You've leveled up!",
                icon: "success",
                confirmButtonText: "OK",
              });
            }
          }
        }
        setIsLoading(false); // End loading
      }, (error) => {
        console.error("Firebase error:", error);
        setIsLoading(false); // End loading on error
      });
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        fetchUserData(user.uid);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe(); // Clean up Firebase listener
      if (unsubscribeAuth) unsubscribeAuth(); // Clean up auth listener
    };
  }, [navigate]);

  // Calculate XP progress only if user has started Ranked Mode
  const calculateXpProgress = useCallback(() => {
    if (!hasStartedRanked) return { xpPercentage: 0, currentThreshold: 0 };
    const currentLevel = xpData.level - 1;
    const currentThreshold = rankingConfig.thresholds[currentLevel] || 100;
    const xpPercentage = (xpData.current / currentThreshold) * 100;
    return { xpPercentage, currentThreshold };
  }, [xpData, hasStartedRanked]);

  const { xpPercentage, currentThreshold } = calculateXpProgress();

  const resetPointsBar = useCallback(() => {
    const newPointsData = { current: 0, total: 900 };
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { points: newPointsData });
    }
    Swal.fire({
      icon: "success",
      title: "Points Bar Reset!",
      text: "The points bar has been reset to 0.",
    });
  }, []);

  const resetMonthlyPointsBar = useCallback(() => {
    const newMpointsData = { current: 0, total: 3000 };
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      update(userRef, { Mpoints: newMpointsData });
    }
    Swal.fire({
      icon: "success",
      title: "Monthly Points Bar Reset!",
      text: "The Monthly points bar has been reset to 0.",
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigate("/signup");
  }, [navigate]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const score = formType === "weekly" ? pointsData.current : MpointsData.current;
    const submissionData = {
      timestamp: new Date().toISOString(),
      type: formType,
      nickname: formData.nickname,
      score: score,
      message: formData.message
    };
  
    try {
      const response = await fetch('https://europe-west1-dashboard-451923.cloudfunctions.net/submitScore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });
  
      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "Submission Successful!",
          text: "Your score has been submitted.",
        });
        setFormData({ nickname: userProfile.name, message: "" });
      } else {
        throw new Error("Submission failed");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: "There was an error submitting your score. Please try again.",
      });
    }
  };

  const styles = {
    containerFluid: { padding: 0 },
    logo: {
      width: "40px",
      height: "40px",
      marginRight: "10px",
    },
    topBar: {
      position: "fixed", // Or "relative" if you want it to scroll with content
      top: 0,
      width: "100%",
      height: "60px",
      backgroundColor: "#ffc107",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 1000,
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    topBarLink: {
      textDecoration: "none",
      color: "#666",
      fontSize: "16px",
      padding: "0 15px",
      display: "flex",
      alignItems: "center",
      transition: "color 0.3s ease",
    },
    topBarIcon: {
      fontSize: "20px",
      marginRight: "8px",
      color: "#666",
      transition: "color 0.3s ease",
    },
    profileAvatar: { position: "relative", display: "inline-block", paddingLeft: "10px" },
    sidebarProfileIcon: { width: "40px", height: "40px", border: "2px solid #007bff" },
    dashboardContent: {
      marginTop: "60px", // Space for the top bar
      transition: "none", // Remove transition since no expansion/contraction
      flex: 1,
    },
    dashboardCard: { borderRadius: "8px", background: "none",border:"none" },
    cardBody: { padding: "12px" },
    cardTitle: { fontSize: "14px", fontWeight: 600 },
    pointsProgress: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #007bff)", // Red to blue gradient
      // boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      transition: "background 0.3s ease, transform 0.3s ease",
      position: "relative",
      overflow: "hidden",
    },
    monthlyPointsProgress: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #ffc107)", // Red to yellow gradient
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      transition: "background 0.3s ease, transform 0.3s ease",
      position: "relative",
      overflow: "hidden",
    },
    progressText: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "white",
      textShadow: "1px 1px 3px rgba(0, 0, 0, 0.3)",
      marginBottom: "10px",
    },
    progressIcon: {
      fontSize: "30px",
      marginBottom: "10px",
      animation: "pulse 2s infinite ease-in-out",
    },
    
    
    videoBackground: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      zIndex: -1,
    },
    videoOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0)", // Transparent to show the video
      zIndex: 0,
    },
    formSelect: { fontSize: "12px", padding: "4px 8px", borderRadius: "4px", marginBottom: "10px" },
  };

  // Animations for creativity
  const stylesString = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    @keyframes spark {
      0% { opacity: 0; transform: translateX(-50%) scale(0); }
      50% { opacity: 0.8; transform: translateX(-50%) scale(1); }
      100% { opacity: 0; transform: translateX(-50%) scale(0); }
    }
  `;

  // Determine icon color based on progress
  const getProgressColor = (current, total) => {
    const percentage = (current / total) * 100;
    if (percentage >= 75) return "#28a745"; // Green for high progress
    if (percentage >= 25) return "#ffc107"; // Yellow for moderate progress
    return "#dc3545"; // Red for low progress
  };

  return (
    <div style={styles.containerFluid}>
      <video
        autoPlay
        loop
        muted
        style={styles.videoBackground}
      >
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div style={styles.videoOverlay}></div>
      <style>{stylesString}</style>
      <div style={styles.topBar}>
        <img src="/trackerLogo.png" alt="xAI Logo" style={styles.logo} />
        <Link to="/dashboard" style={styles.topBarLink}>
          <i className="bi bi-house-fill" style={styles.topBarIcon}></i>
          Home
        </Link>
        <Link to="/leaderboard" style={styles.topBarLink}>
          <i className="bi bi-trophy-fill" style={styles.topBarIcon}></i>
          Leaderboard
        </Link>
        <Link to="/profile" style={styles.topBarLink}>
          <i className="bi bi-person-fill" style={styles.topBarIcon}></i>
          Profile
        </Link>
        <Link to="/statistics" style={styles.topBarLink}>
          <i className="bi bi-bar-chart-fill" style={styles.topBarIcon}></i>
          Statistics
        </Link>
        <Link to="/ranked-mode" style={styles.topBarLink}>
          <i className="bi bi-shield-fill" style={styles.topBarIcon}></i>
          Ranked Mode
        </Link>
        <Link to="/normal-mode" style={styles.topBarLink}>
          <i className="bi bi-star-fill" style={styles.topBarIcon}></i>
          Normal Mode
        </Link>
        <button onClick={handleLogout} style={styles.topBarLink} className="btn btn-link p-0">
          <i className="bi bi-box-arrow-right-fill" style={styles.topBarIcon}></i>
          Logout
        </button>
        <div style={styles.profileAvatar}>
          <Link to="/profile">
            <img
              src={userProfile.photo || "profile-images/default-profile.png"}
              alt="Profile"
              style={styles.sidebarProfileIcon}
              className="rounded-circle"
            />
          </Link>
        </div>
      </div>
      <div style={styles.dashboardContent} className="col p-4">
        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <>
            {/* Profile and Rank Section (Conditional) */}
            <div className="row mb-4">
              <div className="col-12 col-md-6 mb-3 mb-md-0">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="text-center p-3">
                    <img
                      src={userProfile.photo}
                      alt="Profile"
                      className="rounded-circle mb-2"
                      style={{ width: "100px", height: "100px", objectFit: "cover" }}
                    />
                    <h4 style={styles.cardTitle} className="text-dark fw-bold mb-1">{userProfile.name}</h4>
                    <p className="text-muted small">User ID: {auth.currentUser?.uid?.slice(0, 8)}...</p>
                  </div>
                </div>
              </div>
              {hasStartedRanked && (
                <div className="col-12 col-md-6">
                  <div style={styles.dashboardCard} className="card shadow-sm">
                    <div style={styles.cardBody} className="text-center p-3">
                      <h5 className="card-title text-primary mb-2">Your Rank</h5>
                      <img
                        src={userProfile.rankImage}
                        alt="Rank"
                        className="mb-2"
                        style={{ width: "60px", height: "60px", objectFit: "contain" }}
                      />
                      <h6 className="card-text text-dark fw-bold">{userProfile.rankName}</h6>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Sections (Text with Visual Cues) */}
            <div className="row mb-4">
              {hasStartedRanked && (
                <div className="col-12 col-md-4 mb-3 mb-md-0">
                  <div style={styles.dashboardCard} className="card shadow-sm">
                    <div style={styles.cardBody} className="p-3 text-center">
                      <h6 style={styles.cardTitle} className="card-title text-primary mb-2">XP Progress</h6>
                      <div style={styles.pointsProgress} onAnimationEnd={(e) => e.target.style.transform = "scale(1)"}>
                        <i
                          className="bi bi-shield-fill"
                          style={{
                            ...styles.progressIcon,
                            color: getProgressColor(xpData.current, currentThreshold),
                          }}
                        />
                        <p style={styles.progressText}>{xpData.current} / {currentThreshold} XP</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-12 col-md-4 mb-3 mb-md-0">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="p-3 text-center">
                    <h6 style={styles.cardTitle} className="card-title text-primary mb-2">Points Progress</h6>
                    <div style={styles.pointsProgress} onAnimationEnd={(e) => e.target.style.transform = "scale(1)"}>
                      <i
                        className="bi bi-star-fill"
                        style={{
                          ...styles.progressIcon,
                          color: getProgressColor(pointsData.current, pointsData.total),
                        }}
                      />
                      <p style={styles.progressText}>{pointsData.current} / {pointsData.total} pts</p>
                      <button onClick={resetPointsBar} className="btn btn-warning btn-sm mt-2 w-100">Reset Points</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="p-3 text-center">
                    <h6 style={styles.cardTitle} className="card-title text-primary mb-2">Monthly Points Progress</h6>
                    <div style={styles.monthlyPointsProgress} onAnimationEnd={(e) => e.target.style.transform = "scale(1)"}>
                      <i
                        className="bi bi-trophy-fill"
                        style={{
                          ...styles.progressIcon,
                          color: getProgressColor(MpointsData.current, MpointsData.total),
                        }}
                      />
                      <p style={styles.progressText}>{MpointsData.current} / {MpointsData.total} pts</p>
                      <button onClick={resetMonthlyPointsBar} className="btn btn-warning btn-sm mt-2 w-100">Reset Monthly Points</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Submission Form */}
            <div className="row mb-4 justify-content-center">
              <div className="col-12 col-md-6">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="p-3">
                    <h6 style={styles.cardTitle} className="text-primary mb-3">Submit Your Score</h6>
                    <form onSubmit={handleFormSubmit}>
                      <div className="mb-3">
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value)}
                          style={styles.formSelect}
                          className="form-select"
                        >
                          <option value="weekly">Weekly Score</option>
                          <option value="monthly">Monthly Score</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small text-muted">Nickname</label>
                        <input
                          type="text"
                          name="nickname"
                          value={formData.nickname}
                          onChange={handleFormChange}
                          className="form-control form-control-sm"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small text-muted">Score</label>
                        <input
                          type="number"
                          value={formType === "weekly" ? pointsData.current : MpointsData.current}
                          className="form-control form-control-sm"
                          disabled
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small text-muted">Message for Admin</label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleFormChange}
                          className="form-control form-control-sm"
                          rows="3"
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm w-100">Submit Score</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;