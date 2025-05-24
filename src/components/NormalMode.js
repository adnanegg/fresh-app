import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useNormalModeLogic } from "./NormalModeLogic";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import Swal from "sweetalert2";

const NormalMode = ({ globalTasks, refreshGlobalTasks }) => {
  const {
    userData,
    notifications,
    setNotifications,
    isLoading,
    isSyncing,
    selectedTaskIndex,
    setSelectedTaskIndex,
    selectedBoost,
    setSelectedBoost,
    taskTimes,
    handleModeChange,
    applyBoost,
    removeBoost,
    handleTimesChange,
    completeTask,
    undoTask,
    resetTaskCompletionCount,
    resetPointsBar,
    resetMonthlyPointsBar,
    handleLogout,
    startTheWeek,
    startTheDay,
    getProgressColor,
    isAchievementsOpen,
    toggleAchievements,
    claimBonus,
    adjustPoints,
    adjustMonthlyPoints,
    switchMode,
    syncWithFirebase,
    applyGlobalBoost,
    startWeekForAllUsers,
    sendGlobalNotification,
    submitFeedback,
    viewFeedback,
    handleReadyChange,
    resetAllUsersIsReady,
  } = useNormalModeLogic(globalTasks, refreshGlobalTasks, "weekly");

  const [openAchievementSections, setOpenAchievementSections] = React.useState(
    {}
  );
  const [adminSelectedTaskId, setAdminSelectedTaskId] = React.useState("");
  const [adminSelectedBoost, setAdminSelectedBoost] = React.useState("");
  const [isWeeklyTasksOpen, setIsWeeklyTasksOpen] = React.useState(false);
  const [activeTab, setActiveTab] = useState("Tasks");

  useEffect(() => {
    const interval = setInterval(() => {
      syncWithFirebase(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [syncWithFirebase]);

  const handleResetMonthlyPointsBar = async () => {
    const result = await Swal.fire({
      title: "Reset Monthly Points?",
      text: "This will reset your monthly points to 0. This action cannot be undone. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reset",
      confirmButtonColor: "#ffc107",
    });
    if (result.isConfirmed) {
      resetMonthlyPointsBar();
    }
  };

  const handleStartTheDay = async () => {
    const result = await Swal.fire({
      title: "Start New Day?",
      text: "This will reset all daily task counters. Any uncompleted DoubleOrDie tasks will deduct 10 points each. Continue?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Start Day",
      confirmButtonColor: "#007bff",
    });
    if (result.isConfirmed) {
      startTheDay();
    }
  };

  const handleStartTheWeek = async () => {
    const result = await Swal.fire({
      title: "Start New Week?",
      text: "This will reset all task completions, points, and boosts, and archive the current week's data. Continue?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Start Week",
      confirmButtonColor: "#28a745",
    });
    if (result.isConfirmed) {
      startTheWeek();
    }
  };

  const handleResetPointsBar = async () => {
    const result = await Swal.fire({
      title: "Reset Points?",
      text: "This will reset your weekly points to 0. This action cannot be undone. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reset",
      confirmButtonColor: "#ffc107",
    });
    if (result.isConfirmed) {
      resetPointsBar();
    }
  };

  const handleResetTaskCompletionCount = async (index) => {
    const task = userData.tasks[index];
    const result = await Swal.fire({
      title: "Reset Task?",
      text: `This will reset the completion count for "${task.name}" to 0. Continue?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reset",
      confirmButtonColor: "#ffc107",
    });
    if (result.isConfirmed) {
      resetTaskCompletionCount(index);
    }
  };

  const handleSaveProgress = async () => {
    try {
      await syncWithFirebase(true);
      Swal.fire({
        icon: "success",
        title: "Progress Saved!",
        text: "Your progress has been synced to the server.",
        timer: 1500,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save progress. Your changes are saved locally.",
      });
    }
  };

  const styles = {
    containerFluid: { padding: 0 },
    dashboardContent: { marginTop: "60px", flex: 1, zIndex: 10 },
    dashboardCard: {
      borderRadius: "8px",
      backgroundColor: "transparent",
      boxShadow: "none",
    },
    cardBody: {
      padding: "12px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    cardTitle: { fontSize: "14px", fontWeight: 600 },
    listGroupItem: { backgroundColor: "transparent", border: "none" },
    penaltyListGroupItem: {
      backgroundColor: "rgba(139, 0, 0, 0.1)",
      border: "1px solid #8b0000",
      color: "#ff4040",
      fontWeight: "bold",
      padding: "8px",
      borderRadius: "4px",
    },
    formSelectSm: {
      fontSize: "12px",
      padding: "4px 8px",
      borderRadius: "4px",
      width: "120px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    taskNotification: {
      position: "absolute",
      top: "-20px",
      right: "10px",
      fontSize: "12px",
      color: "#000000",
      fontWeight: "bold",
      animation: "popUp 3s ease-out forwards",
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      padding: "4px 8px",
      borderRadius: "4px",
    },
    taskCardOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      zIndex: 10,
    },
    taskCardOverlayIcon: {
      fontSize: "64px",
      color: "#90EE90",
    },
    pointsProgress: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #007bff)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    monthlyPointsProgress: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #ffc107)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    progressText: { fontSize: "24px", fontWeight: "bold", color: "black" },
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
      backgroundColor: "rgba(0, 0, 0, 0)",
      zIndex: -2,
    },
    timesInput: {
      width: "80px",
      padding: "10px",
      fontSize: "16px",
      borderRadius: "6px",
      marginLeft: "10px",
      marginTop: "12px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    saveProgressButton: {
      margin: "10px",
      padding: "8px 16px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "6px",
      transition: "background-color 0.2s",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    saveProgressButtonSaving: {
      backgroundColor: "#0056b3",
      animation: "pulse 1.5s infinite ease-in-out",
    },
    startWeekButton: {
      margin: "10px",
      padding: "8px 16px",
      width: "150px",
      background: "linear-gradient(135deg, #28a745, #1e7e34)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      transition: "transform 0.2s, background 0.2s",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    startDayButton: {
      margin: "10px",
      padding: "8px 16px",
      width: "150px",
      background: "linear-gradient(135deg, #007bff, #0056b3)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      transition: "transform 0.2s, background 0.2s",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    normalmodenav: {
      position: "fixed",
      top: 0,
      width: "100%",
      background: "#ffc107",
      padding: "1rem 2rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 1000,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    profileSection: {
      position: "relative",
      padding: "10px 0",
    },
    switchButton: {
      margin: "0",
      padding: "8px 16px",
      background: "linear-gradient(135deg, #17a2b8, #117a8b)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      transition: "box-shadow 0.2s, background 0.2s",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    achievementsModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "90%",
      maxHeight: "80vh",
      background: "white",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      zIndex: 2000,
      overflowY: "auto",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1999,
    },
    achievementsContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    achievementSection: { flex: 1, margin: "0 10px" },
    tutorialModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "80%",
      maxWidth: "500px",
      background: "linear-gradient(135deg, #007bff, #28a745)",
      color: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
      zIndex: 2002,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    tutorialOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.6)",
      zIndex: 2001,
    },
    tutorialContent: {
      fontSize: "16px",
      lineHeight: "1.6",
      marginBottom: "20px",
    },
    tutorialButton: {
      backgroundColor: "#ffc107",
      color: "#000",
      padding: "8px 16px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    notificationModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "80%",
      maxWidth: "500px",
      background: "linear-gradient(135deg, #dc3545, #ffc107)",
      color: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
      zIndex: 2002,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    notificationButton: {
      backgroundColor: "#dc3545",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    feedbackButton: {
      margin: "10px",
      padding: "8px 16px",
      width: "150px",
      background: "linear-gradient(135deg, #007bff, #0056b3)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      transition: "transform 0.2s, background 0.2s",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    importantSection: {
      marginBottom: "20px",
      border: "2px solid #dc3545",
      borderRadius: "8px",
      background: "rgba(255, 245, 245, 0.9)",
    },
    importantMessage: {
      fontSize: "16px",
      color: "#dc3545",
      padding: "10px",
      textAlign: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    streakInfo: {
      marginLeft: "8px",
      color: "#ff4500",
      fontWeight: "bold",
      fontSize: "14px",
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    taskCard: {
      backgroundColor: "rgba(30, 30, 30, 0.85)",
      color: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      padding: "24px",
      margin: "12px",
      minHeight: "260px",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    taskCardHeader: {
      display: "flex",
      alignItems: "center",
      marginBottom: "16px",
      flexWrap: "wrap",
    },
    taskCardBody: {
      fontSize: "16px",
      marginBottom: "16px",
      flex: 1,
      lineHeight: 1.8,
    },
    taskCardFooter: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
    },
    taskCardContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "16px",
      padding: "16px",
    },
    navTabs: {
      display: "flex",
      justifyContent: "center",
      gap: "8px",
      marginBottom: "16px",
      flexWrap: "wrap",
    },
    navTabButton: {
      padding: "10px 20px",
      minWidth: "100px",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "transform 0.2s, background 0.2s",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    navTabButtonActive: {
      background: "linear-gradient(135deg, #007bff, #0056b3)",
      color: "white",
    },
    navTabButtonInactive: {
      background: "#4a4a4a",
      color: "#e0e0e0",
    },
    iconField: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: "16px",
    },
    iconButton: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: "16px",
    },
  };

  const stylesString = `
    @keyframes popUp { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    
    /* Button hover effects */
    .switch-button:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      background: linear-gradient(135deg, #117a8b, #0d5f6e);
    }
    .start-day-button:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #0056b3, #003d80);
    }
    .start-week-button:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #1e7e34, #155927);
    }
    .apply-global-boost-button:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #a71d2a, #7a1a1f);
    }
    .feedback-button:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #0056b3, #003d80);
    }
    .save-progress-button:hover {
      transform: scale(1.05);
      background: #0056b3;
    }
    .btn-complete {
      background: linear-gradient(135deg, #90EE90, #66CDAA);
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      transition: transform 0.2s, background 0.2s;
    }
    .btn-complete:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #78D878, #55B295);
    }
    .btn-complete:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }
    .btn-danger:hover {
      transform: scale(1.05);
      background: #c82333;
    }
    .btn-warning:hover {
      transform: scale(1.05);
      background: #e0a800;
    }
    .btn-info:hover {
      transform: scale(1.05);
      background: #138496;
    }
    .btn-primary:hover {
      transform: scale(1.05);
      background: #0069d9;
    }
    .nav-logout:hover {
      transform: scale(1.05);
      background: #dc3545;
    }
    .reset-is-ready-button:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #c82333, #a71d2a);
    }
    .nav-tab-button:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #606060, #4a4a4a);
      color: #ffffff;
    }
    .nav-tab-button-active:hover {
      transform: scale(1.05);
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
    }
    /* Task card hover effect */
    .task-card:hover {
      transform: scale(1.03);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    /* Responsive grid */
    @media (max-width: 768px) {
      .task-card-container {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
        padding: 12px;
      }
      .task-card {
        margin: 8px;
      }
    }
    @media (max-width: 576px) {
      .task-card-container {
        grid-template-columns: repeat(auto-fit, minmax(100%, 1fr));
        gap: 12px;
        padding: 12px;
      }
      .task-card {
        margin: 8px;
      }
      .nav-tabs {
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }
    }
  `;

  const toggleAchievementSection = (category) => {
    setOpenAchievementSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const sortedCategories = ["Average", "Advanced", "Master"];

  const handleSwitchToWeekly = () => {
    Swal.fire({
      title: "Switching to Weekly Tracker",
      text: "You’re about to switch to Weekly Mode. In this mode, you can track your tasks over the entire week without daily limits. Focus will be on weekly goals and total completions.",
      icon: "info",
      confirmButtonText: "OK",
      confirmButtonColor: "#17a2b8",
    }).then((result) => {
      if (result.isConfirmed) {
        switchMode("weekly");
      }
    });
  };

  return (
    <div style={styles.containerFluid}>
      <video autoPlay muted loop style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
      </video>
      <div style={styles.videoOverlay}></div>
      {isSyncing && (
        <div style={styles.syncOverlay}>Syncing, please wait...</div>
      )}
      <style>{stylesString}</style>
      <nav style={styles.normalmodenav}>
        <div className="nav-brand">
          <img
            src="/trackerLogo.png"
            alt="Logo"
            className="nav-logo"
            loading="lazy"
          />
          <span className="nav-title">Daily Tracker</span>
        </div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">
            <i className="bi bi-house-fill"></i> Dashboard
          </Link>
          <Link to="/statistics" className="nav-link">
            <i className="bi bi-bar-chart-fill"></i> Statistics
          </Link>
          <Link to="/gamepage" className="nav-link">
            <i className="bi bi-dice-6-fill"></i> Game
          </Link>
          {auth.currentUser?.email === "admin@gmail.com" && (
            <Link to="/adminpage" className="nav-link">
              <i className="bi bi-gear-fill"></i> Admin Panel
            </Link>
          )}
          <button
            onClick={toggleAchievements}
            className="nav-link"
            id="achievements-button"
          >
            <i className="bi bi-trophy-fill"></i> Achievements
          </button>
          <button
            onClick={handleSwitchToWeekly}
            style={styles.switchButton}
            className="nav-link switch-button"
            title="Switch to Weekly Mode"
          >
            <i className="bi bi-arrow-repeat me-2"></i>
            Switch to Weekly Mode
          </button>
          <button onClick={handleLogout} className="nav-logout">
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </nav>
      <div style={styles.dashboardContent} className="col p-4">
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Syncing...</span>
            </div>
            <p className="mt-2">Syncing with server...</p>
          </div>
        ) : (
          <>
            <div className="row mb-4">
              <div className="col-12 col-md-4 mb-3">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div
                    style={styles.cardBody}
                    className="text-center p-3 d-flex flex-column align-items-center"
                  >
                    <h4
                      style={styles.cardTitle}
                      className="text-dark fw-bold mb-1"
                    >
                      {userData.profile.name}
                    </h4>
                    <p className="text-muted small">
                      User ID: {userData?.uid?.slice(0, 8)}...
                    </p>
                    <div className="mt-2">
                      <span className="me-3">
                        <i
                          className="bi bi-star-fill"
                          style={{ color: "#cd7f32", fontSize: "20px" }}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "bronze"
                          ).length
                        }
                      </span>
                      <span className="me-3">
                        <i
                          className="bi bi-star-fill"
                          style={{ color: "#c0c0c0", fontSize: "20px" }}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "silver"
                          ).length
                        }
                      </span>
                      <span>
                        <i
                          className="bi bi-star-fill"
                          style={{ color: "#ffd700", fontSize: "20px" }}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "gold"
                          ).length
                        }
                      </span>
                    </div>
                    <div className="mt-3">
                      <label className="d-flex align-items-center">
                        <input
                          type="checkbox"
                          checked={userData.isReady}
                          onChange={(e) => handleReadyChange(e.target.checked)}
                          className="me-2"
                        />
                        <span className="text-muted small">
                          Share my data with admin
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row mb-4">
                <div className="col-12">
                  <div style={styles.dashboardCard} className="card shadow-sm">
                    <div style={styles.cardBody} className="p-3">
                      <h6 style={styles.cardTitle}>Important Messages</h6>
                      <div style={styles.importantSection}>
                        {userData.adminMessage ? (
                          <p style={styles.importantMessage}>
                            {userData.adminMessage}
                          </p>
                        ) : (
                          <p style={styles.importantMessage}>
                            No important messages from admin.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4 mb-3">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="p-3 text-center">
                    <h6 style={styles.cardTitle}>Points Progress</h6>
                    <div style={styles.pointsProgress}>
                      <i
                        className="bi bi-star-fill"
                        style={{
                          ...styles.progressIcon,
                          color: getProgressColor(
                            userData.points.current,
                            userData.points.total
                          ),
                        }}
                      />
                      <p style={styles.progressText}>
                        {userData.points.current} / {userData.points.total} pts
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button
                          onClick={() => adjustPoints(5)}
                          className="btn btn-success btn-sm"
                        >
                          +5pts
                        </button>
                        <button
                          onClick={() => adjustPoints(-5)}
                          className="btn btn-danger btn-sm"
                        >
                          −5pts
                        </button>
                      </div>
                      <button
                        onClick={handleResetPointsBar}
                        className="btn btn-warning w-100 mt-2"
                      >
                        Reset Points
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4 mb-3">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="p-3 text-center">
                    <h6 style={styles.cardTitle}>Monthly Points Progress</h6>
                    <div style={styles.monthlyPointsProgress}>
                      <i
                        className="bi bi-trophy-fill"
                        style={{
                          ...styles.progressIcon,
                          color: getProgressColor(
                            userData.Mpoints.current,
                            userData.Mpoints.total
                          ),
                        }}
                      />
                      <p style={styles.progressText}>
                        {userData.Mpoints.current} / {userData.Mpoints.total}{" "}
                        pts
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button
                          onClick={() => adjustMonthlyPoints(5)}
                          className="btn btn-success btn-sm"
                        >
                          +5pts
                        </button>
                        <button
                          onClick={() => adjustMonthlyPoints(-5)}
                          className="btn btn-danger btn-sm"
                        >
                          −5pts
                        </button>
                      </div>
                      <button
                        onClick={handleResetMonthlyPointsBar}
                        className="btn btn-warning w-100 mt-2"
                      >
                        Reset Monthly Points
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-4" id="apply-boost">
              <div className="col-12">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div className="p-3">
                    <h6 style={{ fontSize: "16px", fontWeight: "bold" }}>
                      Apply a Boost
                    </h6>
                    <div className="d-flex align-items-center flex-wrap">
                      <select
                        value={selectedTaskIndex}
                        onChange={(e) => setSelectedTaskIndex(e.target.value)}
                        className="me-2 mb-2"
                      >
                        <option value="">Select a Task</option>
                        {userData.tasks.map(
                          (task, originalIndex) =>
                            task.category !== "Bonus" && (
                              <option key={task.taskId} value={originalIndex}>
                                {task.name}{" "}
                                {task.boost ? `(${task.boost})` : ""}
                              </option>
                            )
                        )}
                      </select>
                      <select
                        value={selectedBoost}
                        onChange={(e) => setSelectedBoost(e.target.value)}
                        className="me-2 mb-2"
                      >
                        <option value="">Select a Boost</option>
                        {Object.entries({
                          DoubleEverything: {
                            description: "Jackpot : Double Points",
                          },
                          "+30Percent": {
                            description:
                              "The Investor : Increases Points by 30%",
                          },
                          TheSavior: {
                            description: "The Savior : Multiple completions",
                          },
                          DoubleOrDie: {
                            description: "العذاب المعسول :Double or -10",
                          },
                          PerfectBonus: { description: "50 point bonus" },
                        }).map(([key, boost]) => (
                          <option key={key} value={key}>
                            {boost.description}
                          </option>
                        ))}
                      </select>
                      <button onClick={applyBoost} className="mb-2">
                        Apply Boost
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {auth.currentUser?.email === "admin@gmail.com" && (
              <div className="row mb-4" id="admin-apply-global-boost">
                <div className="col-12">
                  <div style={styles.dashboardCard} className="card shadow-sm">
                    <div className="p-3">
                      <h6 style={{ fontSize: "16px", fontWeight: "bold" }}>
                        Admin: Global Controls
                      </h6>
                      <div className="d-flex align-items-center flex-wrap">
                        <select
                          value={adminSelectedTaskId}
                          onChange={(e) =>
                            setAdminSelectedTaskId(e.target.value)
                          }
                          className="me-2 mb-2"
                        >
                          <option value="">Select a Task</option>
                          {Object.entries(globalTasks).map(([taskId, task]) => (
                            <option key={taskId} value={taskId}>
                              {task.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={adminSelectedBoost}
                          onChange={(e) =>
                            setAdminSelectedBoost(e.target.value)
                          }
                          className="me-2 mb-2"
                        >
                          <option value="">Select a Boost</option>
                          {Object.entries({
                            DoubleEverything: {
                              description: "Jackpot : Double Points",
                            },
                            "+30Percent": {
                              description:
                                "The Investor : Increases Points by 30%",
                            },
                            TheSavior: {
                              description: "The Savior : Multiple completions",
                            },
                            DoubleOrDie: {
                              description: "العذاب المعسول :Double or -10",
                            },
                            PerfectBonus: { description: "50 point bonus" },
                          }).map(([key, boost]) => (
                            <option key={key} value={key}>
                              {boost.description}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            applyGlobalBoost(
                              adminSelectedTaskId,
                              adminSelectedBoost
                            )
                          }
                          className="mb-2 apply-global-boost-button me-2"
                        >
                          Apply Globally
                        </button>
                        <button
                          onClick={startWeekForAllUsers}
                          className="mb-2 apply-global-boost-button me-2"
                        >
                          Start Week for All Users
                        </button>
                        <button
                          onClick={sendGlobalNotification}
                          className="mb-2 apply-global-boost-button me-2"
                        >
                          Send Global Notification
                        </button>
                        <button
                          onClick={viewFeedback}
                          className="mb-2 apply-global-boost-button me-2"
                        >
                          View Feedback
                        </button>
                        <button
                          onClick={resetAllUsersIsReady}
                          className="mb-2 apply-global-boost-button reset-is-ready-button me-2"
                        >
                          Reset All Users IsReady
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="row mb-4" id="start-buttons">
              <div className="d-flex justify-content-between flex-wrap">
                <button
                  onClick={handleStartTheDay}
                  style={styles.startDayButton}
                  className="btn start-day-button"
                  title="Start today's tasks"
                >
                  <i className="bi bi-sunrise me-2"></i>
                  Start Today
                </button>
                <button
                  onClick={handleSaveProgress}
                  style={{
                    ...styles.saveProgressButton,
                    ...(isSyncing ? styles.saveProgressButtonSaving : {}),
                  }}
                  className="btn save-progress-button"
                  title="Save your current progress"
                  disabled={isSyncing}
                >
                  <i className="bi bi-save-fill me-2"></i>
                  {isSyncing ? "Saving..." : "Save Your Progress"}
                </button>
                <button
                  onClick={handleStartTheWeek}
                  style={styles.startWeekButton}
                  className="btn start-week-button"
                  title="Start this week's tasks"
                >
                  <i className="bi bi-calendar-week me-2"></i>
                  Start This Week
                </button>
                {auth.currentUser?.email !== "admin@gmail.com" && (
                  <button
                    onClick={submitFeedback}
                    style={styles.feedbackButton}
                    className="btn feedback-button"
                    title="Share your feedback"
                  >
                    <i className="bi bi-chat-text-fill me-2"></i>
                    Give Feedback
                  </button>
                )}
              </div>
            </div>

            <div className="row">
              <div className="col-12 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
                  id="daily-tasks"
                >
                  <div style={styles.cardBody}>
                    <h6 style={styles.cardTitle}>Daily Tasks</h6>
                    <div style={styles.navTabs} className="nav-tabs">
                      <button
                        style={{
                          ...styles.navTabButton,
                          ...(activeTab === "Tasks"
                            ? styles.navTabButtonActive
                            : styles.navTabButtonInactive),
                        }}
                        className="nav-tab-button nav-tab-button-active"
                        onClick={() => setActiveTab("Tasks")}
                      >
                        Tasks
                      </button>
                      <button
                        style={{
                          ...styles.navTabButton,
                          ...(activeTab === "Bonus"
                            ? styles.navTabButtonActive
                            : styles.navTabButtonInactive),
                        }}
                        className="nav-tab-button"
                        onClick={() => setActiveTab("Bonus")}
                      >
                        Bonus
                      </button>
                    </div>
                    <div
                      style={styles.taskCardContainer}
                      className="task-card-container"
                    >
                      {userData.tasks.length > 0 ? (
                        userData.tasks
                          .map((task, originalIndex) => ({
                            task,
                            originalIndex,
                          }))
                          .filter(({ task }) =>
                            activeTab === "Tasks"
                              ? task.category !== "Bonus"
                              : task.category === "Bonus"
                          )
                          .map(({ task, originalIndex }) => {
                            const isCompleteDisabled =
                              task.dailyCounter >= task.dailyLimit;
                            const isBonusClaimable =
                              task.category !== "Bonus" &&
                              task.completionCount >= task.numberLimit &&
                              !task.bonusClaimed;
                            return (
                              <div
                                key={task.taskId}
                                style={styles.taskCard}
                                className="task-card"
                                id={`task-${task.taskId}`}
                              >
                                {isCompleteDisabled && (
                                  <div style={styles.taskCardOverlay}>
                                    <i
                                      className="bi bi-check-circle-fill"
                                      style={styles.taskCardOverlayIcon}
                                    ></i>
                                  </div>
                                )}
                                <div style={styles.taskCardHeader}>
                                  <span style={{ color: "#ff6666" }}>
                                    {task.name}
                                  </span>
                                  {task.streak > 0 && (
                                    <span style={styles.streakInfo}>
                                      <i
                                        className="bi bi-fire me-1"
                                        style={{
                                          color: "#ff4500",
                                          fontSize: "14px",
                                        }}
                                      ></i>
                                      {task.streak}
                                    </span>
                                  )}
                                  {task.boost && (
                                    <span className="badge bg-primary ms-2">
                                      <i
                                        className="bi bi-rocket me-1"
                                        style={{ fontSize: "12px" }}
                                      ></i>
                                      {task.boost}
                                    </span>
                                  )}
                                </div>
                                <div style={styles.taskCardBody}>
                                  <p className="mb-3" style={styles.iconField}>
                                    <i
                                      className="bi bi-coin me-1"
                                      style={{
                                        color: "#ffd700",
                                        fontSize: "16px",
                                      }}
                                    ></i>
                                    <strong>Points:</strong> {task.points}
                                    {task.penaltyPoints || task.penalty
                                      ? ` (-${
                                          task.penaltyPoints || task.penalty
                                        } penalty)`
                                      : ""}
                                  </p>
                                  <p className="mb-3" style={styles.iconField}>
                                    <i
                                      className="bi bi-check-circle me-1"
                                      style={{
                                        color: "#28a745",
                                        fontSize: "16px",
                                      }}
                                    ></i>
                                    <strong>Completion:</strong>{" "}
                                    {task.completionCount}/{task.numberLimit}
                                  </p>
                                  <p className="mb-3" style={styles.iconField}>
                                    <i
                                      className="bi bi-infinity me-1"
                                      style={{
                                        color: "#17a2b8",
                                        fontSize: "16px",
                                      }}
                                    ></i>
                                    <strong>Lifetime:</strong>{" "}
                                    {task.lifetimeCompletionCount}
                                  </p>
                                  <p className="mb-3" style={styles.iconField}>
                                    <i
                                      className="bi bi-clock me-1"
                                      style={{
                                        color: "#aaaaaa",
                                        fontSize: "16px",
                                      }}
                                    ></i>
                                    <strong>Daily:</strong> {task.dailyCounter}/
                                    {task.dailyLimit}
                                  </p>
                                  {task.hasTimesOption && (
                                    <div className="mt-3">
                                      <input
                                        type="number"
                                        min="1"
                                        value={taskTimes[originalIndex] || ""}
                                        onChange={(e) =>
                                          handleTimesChange(
                                            originalIndex,
                                            e.target.value
                                          )
                                        }
                                        style={styles.timesInput}
                                        placeholder="Times"
                                        className="form-control form-control-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div style={styles.taskCardFooter}>
                                  <button
                                    onClick={() => completeTask(originalIndex)}
                                    className="btn btn-complete btn-sm"
                                    disabled={isCompleteDisabled}
                                    style={styles.iconButton}
                                  >
                                    <i
                                      className="bi bi-check2 me-1"
                                      style={{ fontSize: "16px" }}
                                    ></i>
                                    Complete
                                  </button>
                                  {task.category !== "Bonus" &&
                                    task.hasExceptionalOption && (
                                      <select
                                        value={task.selectedMode || "normal"}
                                        onChange={(e) =>
                                          handleModeChange(
                                            originalIndex,
                                            e.target.value
                                          )
                                        }
                                        style={styles.formSelectSm}
                                        className="form-select form-select-sm"
                                      >
                                        <option value="normal">Normal</option>
                                        <option value="exceptional">
                                          Exceptional
                                        </option>
                                        <option value="penalty">Penalty</option>
                                      </select>
                                    )}
                                  {task.boost && (
                                    <button
                                      onClick={() => removeBoost(originalIndex)}
                                      className="btn btn-danger btn-sm"
                                      style={styles.iconButton}
                                    >
                                      <i
                                        className="bi bi-x-circle me-1"
                                        style={{ fontSize: "16px" }}
                                      ></i>
                                      Remove Boost
                                    </button>
                                  )}
                                  {isBonusClaimable && (
                                    <button
                                      onClick={() => claimBonus(originalIndex)}
                                      className="btn btn-info btn-sm"
                                      style={styles.iconButton}
                                    >
                                      <i
                                        className="bi bi-gift me-1"
                                        style={{ fontSize: "16px" }}
                                      ></i>
                                      Claim Bonus
                                    </button>
                                  )}
                                </div>
                                {notifications
                                  .filter(
                                    (n) =>
                                      n.position === `task-${task.taskId}` &&
                                      !n.global
                                  )
                                  .map((notification) => (
                                    <div
                                      key={notification.id}
                                      style={styles.taskNotification}
                                      className="task-notification"
                                    >
                                      {notification.points
                                        ? `${
                                            notification.points > 0 ? "+" : ""
                                          }${notification.points}pts`
                                        : ""}
                                    </div>
                                  ))}
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-muted small">
                          No {activeTab.toLowerCase()} available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
                >
                  <div style={styles.cardBody}>
                    <h6 style={styles.cardTitle}>Daily Completed Tasks</h6>
                    {userData.completedTasks.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {userData.completedTasks
                          .filter((task) => task.dailyCounter > 0)
                          .map((task, index) => (
                            <li
                              key={task.taskId}
                              style={
                                task.isPenalty
                                  ? styles.penaltyListGroupItem
                                  : styles.listGroupItem
                              }
                              className="d-flex justify-content-between align-items-center py-1"
                            >
                              <span>
                                <span className="fw-bold text-dark">
                                  {task.dailyCounter}x
                                </span>{" "}
                                {task.name}{" "}
                                <small className="text-muted ms-2">
                                  (Daily: {task.dailyCounter}/{task.dailyLimit})
                                </small>
                              </span>
                              <button
                                onClick={() => undoTask(index)}
                                className="btn btn-danger btn-sm"
                              >
                                Undo
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-muted text-center small">
                        No completed tasks today.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
                >
                  <div style={styles.cardBody}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 style={styles.cardTitle}>
                        This Week Completed Tasks
                      </h6>
                      <button
                        onClick={() => setIsWeeklyTasksOpen(!isWeeklyTasksOpen)}
                        className="btn btn-outline-primary btn-sm"
                      >
                        {isWeeklyTasksOpen ? "Hide" : "Show"}
                      </button>
                    </div>
                    {isWeeklyTasksOpen && (
                      <div>
                        {userData.completedTasks.length > 0 ? (
                          <ul className="list-group list-group-flush">
                            {userData.completedTasks.map((task, index) => (
                              <li
                                key={task.taskId}
                                style={
                                  task.isPenalty
                                    ? styles.penaltyListGroupItem
                                    : styles.listGroupItem
                                }
                                className="d-flex justify-content-between align-items-center py-1"
                              >
                                <span>
                                  <span className="fw-bold text-dark">
                                    {task.completionCount}x
                                  </span>{" "}
                                  {task.name}{" "}
                                  <small className="text-muted ms-2">
                                    (Daily: {task.dailyCounter}/
                                    {task.dailyLimit})
                                  </small>
                                </span>
                                <button
                                  onClick={() => undoTask(index)}
                                  className="btn btn-danger btn-sm"
                                >
                                  Undo
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted text-center small">
                            No completed tasks this week.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isAchievementsOpen && (
              <>
                <div style={styles.overlay} onClick={toggleAchievements}></div>
                <div style={styles.achievementsModal}>
                  <h5>Achievements</h5>
                  <button
                    onClick={toggleAchievements}
                    className="btn btn-danger float-end"
                  >
                    Close
                  </button>
                  <div style={styles.achievementsContainer}>
                    {sortedCategories.map((category) => {
                      const achievements =
                        JSON.parse(
                          localStorage.getItem("achievements") || "{}"
                        )[category] || [];
                      return (
                        <div key={category} style={styles.achievementSection}>
                          <h6>
                            <button
                              className={`btn btn-link ${
                                !openAchievementSections[category]
                                  ? "collapsed"
                                  : ""
                              }`}
                              onClick={() => toggleAchievementSection(category)}
                              style={{ textDecoration: "none", color: "#000" }}
                            >
                              {category} ({achievements.length})
                            </button>
                          </h6>
                          {openAchievementSections[category] && (
                            <ul className="list-group">
                              {achievements.map((achievement) => {
                                const task = userData.tasks.find(
                                  (t) => t.taskId === achievement.taskId
                                );
                                const progress = task
                                  ? task.lifetimeCompletionCount
                                  : 0;
                                const isEarned =
                                  !!userData.achievements[achievement.name];
                                const starColor = isEarned
                                  ? {
                                      bronze: "#cd7f32",
                                      silver: "#c0c0c0",
                                      gold: "#ffd700",
                                    }[
                                      userData.achievements[achievement.name]
                                        .star
                                    ]
                                  : "#ccc";
                                return (
                                  <li
                                    key={achievement.name}
                                    className="list-group-item d-flex justify-content-between align-items-center"
                                  >
                                    <div>
                                      <span
                                        style={{
                                          fontWeight: isEarned
                                            ? "bold"
                                            : "normal",
                                          color: isEarned ? "#28a745" : "#000",
                                        }}
                                      >
                                        {achievement.name} -{" "}
                                        {achievement.description}
                                      </span>
                                      <br />
                                      <small>
                                        Progress: {progress}/
                                        {achievement.target}{" "}
                                        {isEarned
                                          ? `(Earned: ${new Date(
                                              userData.achievements[
                                                achievement.name
                                              ].earnedAt
                                            ).toLocaleDateString()})`
                                          : ""}
                                      </small>
                                    </div>
                                    <i
                                      className="bi bi-star-fill"
                                      style={{
                                        color: starColor,
                                        fontSize: "20px",
                                      }}
                                    ></i>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NormalMode;
