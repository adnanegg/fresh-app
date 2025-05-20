import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useNormalModeLogic } from "./NormalModeLogic";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const WeeklyModeMobile = ({ globalTasks, refreshGlobalTasks }) => {
  const {
    userData,
    notifications,
    openSections,
    isLoading,
    isSyncing,
    selectedTaskIndex,
    setSelectedTaskIndex,
    selectedBoost,
    setSelectedBoost,
    taskTimes,
    groupedTasks,
    toggleSection,
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
    getProgressColor,
    isAchievementsOpen,
    toggleAchievements,
    claimBonus,
    adjustPoints,
    adjustMonthlyPoints,
    switchMode,
    missTask,
    syncWithFirebase,
    submitFeedback,
    viewFeedback,
    handleReadyChange,
  } = useNormalModeLogic(globalTasks, refreshGlobalTasks, "weekly");

  const [openAchievementSections, setOpenAchievementSections] = useState({});

  // Sync every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      syncWithFirebase(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [syncWithFirebase]);

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
  const styles = {
    container: {
      padding: 0,
      minHeight: "100vh",
    },
    dashboardContent: {
      marginTop: "60px",
      padding: "10px",
      flex: 1,
      zIndex: 10,
    },
    dashboardCard: {
      borderRadius: "6px",
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
    },
    cardBody: {
      padding: "8px",
    },
    cardTitle: {
      fontSize: "11px",
      fontWeight: 600,
      color: "black",
    },
    listGroupItem: {
      backgroundColor: "transparent",
      border: "none",
      fontSize: "12px",
      color: "black",
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
      backgroundColor: "rgba(0, 0, 0, 0.02)",
      zIndex: -2,
    },
    penaltyListGroupItem: {
      backgroundColor: "rgba(139, 0, 0, 0.1)",
      border: "1px solid #8b0000",
      color: "#ff4040",
      fontWeight: "bold",
      padding: "4px",
      borderRadius: "3px",
      fontSize: "12px",
    },
    formSelectSm: {
      fontSize: "9px",
      padding: "2px 4px",
      borderRadius: "3px",
      width: "90px",
      height: "30px",
    },
    taskNotification: {
      position: "absolute",
      top: "-12px",
      right: 0,
      fontSize: "9px",
      color: "#28a745",
      fontWeight: "bold",
      animation: "popUp 3s ease-out forwards",
    },
    pointsProgress: {
      textAlign: "center",
      padding: "8px",
      borderRadius: "6px",
      background: "linear-gradient(135deg, #ff6b6b, #007bff)",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    },
    monthlyPointsProgress: {
      textAlign: "center",
      padding: "8px",
      borderRadius: "6px",
      background: "linear-gradient(135deg, #ff6b6b, #ffc107)",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    },
    progressText: {
      fontSize: "16px",
      fontWeight: "bold",
      color: "black",
    },
    progressIcon: {
      fontSize: "18px",
      marginBottom: "4px",
      animation: "pulse 2s infinite ease-in-out",
    },
    timesInput: {
      width: "50px",
      padding: "3px",
      fontSize: "11px",
      borderRadius: "3px",
      marginLeft: "4px",
      height: "30px",
    },
    startWeekButton: {
      margin: "4px",
      padding: "6px 12px",
      width: "120px",
      background: "linear-gradient(135deg, #28a745, #1e7e34)",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "11px",
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 5,
    },
    refreshTasksButton: {
      margin: "4px",
      padding: "6px 12px",
      width: "120px",
      background: "linear-gradient(135deg, #ffc107, #e0a800)",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "11px",
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 5,
    },
    saveProgressButton: {
      margin: "4px",
      padding: "6px 12px",
      width: "120px",
      background: "linear-gradient(135deg, #007bff, #0056b3)",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "11px",
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    switchButton: {
      margin: "4px",
      padding: "6px 12px",
      background: "linear-gradient(135deg, #17a2b8, #117a8b)",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "11px",
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    normalModeNav: {
      position: "fixed",
      top: 0,
      width: "100%",
      background: "#ffc107",
      padding: "0.4rem 0.8rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 1000,
    },
    navLogo: {
      width: "25px",
    },
    navTitle: {
      fontSize: "12px",
    },
    navLinks: {
      fontSize: "11px",
    },
    navLogout: {
      padding: "2px 4px",
      minWidth: "44px",
      minHeight: "44px",
    },
    userId: {
      fontSize: "9px",
    },
    bronzeStar: {
      color: "#cd7f32",
      fontSize: "12px",
    },
    silverStar: {
      color: "#c0c0c0",
      fontSize: "12px",
    },
    goldStar: {
      color: "#ffd700",
      fontSize: "12px",
    },
    loadingText: {
      fontSize: "12px",
      color: "black",
    },
    applyBoostTitle: {
      fontSize: "11px",
      fontWeight: "bold",
      color: "black",
    },
    taskStats: {
      fontSize: "10px",
      color: "black",
      display: "block",
    },
    noTasks: {
      fontSize: "11px",
      color: "white",
    },
    achievementsModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "95%",
      maxHeight: "85vh",
      background: "transparent",
      padding: "12px",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
      zIndex: 2000,
      overflowY: "auto",
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
      flexDirection: "column",
      width: "100%",
    },
    achievementSection: {
      margin: "4px 0",
    },
    achievementsTitle: {
      fontSize: "12px",
      color: "black",
    },
    earnedAchievement: {
      fontWeight: "bold",
      color: "#28a745",
    },
    tutorialModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "95%",
      maxHeight: "85vh",
      background: "linear-gradient(135deg, #007bff, #28a745)",
      color: "white",
      padding: "16px",
      borderRadius: "12px",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
      zIndex: 2002,
      fontFamily: "'Arial', sans-serif",
      overflowY: "auto",
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
      fontSize: "12px",
      lineHeight: "1.6",
      marginBottom: "16px",
    },
    tutorialCheckbox: {
      marginRight: "8px",
    },
    tutorialButton: {
      backgroundColor: "#ffc107",
      color: "#000",
      padding: "6px 12px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "11px",
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    syncOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2001,
    },
    syncOverlayText: {
      background: "white",
      padding: "12px 24px",
      borderRadius: "6px",
      fontSize: "12px",
      color: "#343a40",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    notificationModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "90%",
      maxWidth: "300px",
      background: "linear-gradient(135deg, #dc3545, #ffc107)",
      color: "white",
      padding: "12px",
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      zIndex: 2002,
      fontFamily: "'Arial', sans-serif",
    },
    notificationButton: {
      backgroundColor: "#dc3545",
      color: "white",
      padding: "6px 12px",
      border: "none",
      borderRadius: "3px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "11px",
    },
    feedbackButton: {
      margin: "4px",
      padding: "6px 12px",
      width: "120px",
      background: "linear-gradient(135deg, #007bff, #0056b3)",
      color: "white",
      border: "none",
      borderRadius: "3px",
      fontSize: "11px",
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform 0.2s, background 0.2s",
      zIndex: 5,
    },
  };

  const showTaskDescription = (taskId) => {
    if (!globalTasks || !taskId) return;
    const task = globalTasks[taskId];
    if (!task) return;
    Swal.fire({
      title: task.name,
      text: `Summary: ${task.summary || "No summary"}\nPoints: ${
        task.points
      }\nPenalty: ${
        task.penalty || task.penaltyPoints || "None"
      }\nWeekly Goal: ${task.numberLimit} times`,
      icon: "info",
    });
  };

  const handleSwitchToDaily = () => {
    Swal.fire({
      title: "Switching to Daily Tracker",
      text: "You’re about to switch to Daily Mode. In this mode, tasks are tracked daily with specific limits per day. You’ll manage daily completions and penalties.",
      icon: "info",
      confirmButtonText: "OK",
      confirmButtonColor: "#17a2b8",
    }).then((result) => {
      if (result.isConfirmed) {
        switchMode("daily");
      }
    });
  };

  const toggleAchievementSection = (category) => {
    setOpenAchievementSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
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

  const sortedCategories = ["Average", "Advanced", "Master"];

  return (
    <div style={styles.container} className="container-fluid">
      <video autoPlay loop muted style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={styles.videoOverlay}></div>
      <style>
        {`
          @keyframes popUp {
            0% { opacity: 0; transform: translateY(-10px); }
            50% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          .feedback-button:hover, .feedback-button:active {
            transform: scale(1.05);
            background: linear-gradient(135deg, #0056b3, #003d80);
          }
        `}
      </style>
      {isSyncing && (
        <div style={styles.syncOverlay} className="sync-overlay">
          <div style={styles.syncOverlayText}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Syncing...</span>
            </div>
            Syncing, please wait...
          </div>
        </div>
      )}

      <nav style={styles.normalModeNav} className="normalmodenav">
        <div className="nav-brand">
          <img src="/trackerLogo.png" alt="Logo" style={styles.navLogo} />
          <span style={styles.navTitle}>Weekly Mode</span>
        </div>
        <div style={styles.navLinks} className="nav-links">
          <Link to="/dashboard" className="nav-link">
            <i className="bi bi-house-fill"></i>
          </Link>
          <Link to="/normal-mode" className="nav-link">
            <i className="bi bi-star-fill"></i>
          </Link>
          <Link to="/statistics" className="nav-link">
            <i className="bi bi-bar-chart-fill"></i>
          </Link>
          <Link to="/gamepage" className="nav-link">
            <i className="bi bi-dice-6-fill"></i>
          </Link>
          <button
            onClick={toggleAchievements}
            style={{ padding: "2px 4px", minWidth: "44px", minHeight: "44px" }}
            className="nav-link"
          >
            <i className="bi bi-trophy-fill"></i>
          </button>
          <button
            onClick={handleSwitchToDaily}
            style={styles.switchButton}
            className="nav-link switch-button"
            title="Switch to Daily Mode"
          >
            <i className="bi bi-arrow-repeat me-1"></i>
            Daily
          </button>
          <button
            onClick={handleLogout}
            style={styles.navLogout}
            className="nav-logout"
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </nav>
      <div style={styles.dashboardContent} className="dashboard-content">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p style={styles.loadingText}>Loading tasks...</p>
          </div>
        ) : (
          <>
            <div className="row mb-2">
              <div className="col-12 mb-2">
                <div
                  style={styles.dashboardCard}
                  className="card dashboard-card"
                >
                  <div
                    style={styles.cardBody}
                    className="text-center p-2 card-body"
                  >
                    <h4
                      style={{
                        color: "#343a40",
                        fontWeight: "bold",
                        marginBottom: "4px",
                      }}
                    >
                      {userData.profile.name}
                    </h4>
                    <p style={styles.userId}>
                      User ID: {auth.currentUser?.uid?.slice(0, 8)}...
                    </p>
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ marginRight: "8px" }}>
                        <i
                          className="bi bi-star-fill"
                          style={styles.bronzeStar}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "bronze"
                          ).length
                        }
                      </span>
                      <span style={{ marginRight: "8px" }}>
                        <i
                          className="bi bi-star-fill"
                          style={styles.silverStar}
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
                          style={styles.goldStar}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "gold"
                          ).length
                        }
                      </span>
                    </div>
                    {/* Checkbox for isReady using handleReadyChange */}
                    <div className="mt-1">
                      <label className="d-flex align-items-center justify-content-center">
                        <input
                          type="checkbox"
                          checked={userData.isReady}
                          onChange={(e) => handleReadyChange(e.target.checked)}
                          className="me-2"
                          style={{ transform: "scale(0.8)" }}
                        />
                        <span
                          className="text-muted"
                          style={{ fontSize: "9px" }}
                        >
                          Share my data with admin
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 mb-2">
                <div
                  style={styles.dashboardCard}
                  className="card dashboard-card"
                >
                  <div
                    style={styles.cardBody}
                    className="p-2 text-center card-body"
                  >
                    <h6 style={styles.cardTitle}>Points Progress</h6>
                    <div style={styles.pointsProgress}>
                      <i
                        className="bi bi-star-fill progress-icon"
                        style={{
                          ...styles.progressIcon,
                          color: getProgressColor(
                            userData.points.current,
                            userData.points.total
                          ),
                        }}
                      />
                      <p style={styles.progressText}>
                        {userData.points.current}/{userData.points.total}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
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
                      <div style={{ width: "100%", marginTop: "4px" }}>
                        <button
                          onClick={handleResetPointsBar}
                          style={{ width: "100%" }}
                          className="btn btn-warning btn-sm"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 mb-2">
                <div
                  style={styles.dashboardCard}
                  className="card dashboard-card"
                >
                  <div
                    style={styles.cardBody}
                    className="p-2 text-center card-body"
                  >
                    <h6 style={styles.cardTitle}>Monthly Points Progress</h6>
                    <div style={styles.monthlyPointsProgress}>
                      <i
                        className="bi bi-trophy-fill progress-icon"
                        style={{
                          ...styles.progressIcon,
                          color: getProgressColor(
                            userData.Mpoints.current,
                            userData.Mpoints.total
                          ),
                        }}
                      />
                      <p style={styles.progressText}>
                        {userData.Mpoints.current}/{userData.Mpoints.total}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
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
                      <div style={{ width: "100%", marginTop: "4px" }}>
                        <button
                          onClick={handleResetMonthlyPointsBar}
                          style={{ width: "100%" }}
                          className="btn btn-warning btn-sm"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-12">
                <div
                  style={styles.dashboardCard}
                  className="card dashboard-card"
                >
                  <div style={styles.cardBody}>
                    <h6 style={styles.applyBoostTitle}>Apply Boost</h6>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <select
                        value={selectedTaskIndex}
                        onChange={(e) => setSelectedTaskIndex(e.target.value)}
                        style={styles.formSelectSm}
                        className="mb-2 me-2 form-select-sm"
                      >
                        <option value="">Select Task</option>
                        {userData.tasks.map((task, index) => (
                          <option key={index} value={index}>
                            {task.name} {task.boost ? `(${task.boost})` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedBoost}
                        onChange={(e) => setSelectedBoost(e.target.value)}
                        style={styles.formSelectSm}
                        className="mb-2 me-2 form-select-sm"
                      >
                        <option value="">Select Boost</option>
                        {Object.entries({
                          DoubleEverything: { description: "Doubles Points" },
                          "+30Percent": {
                            description: "Increases Points by 30%",
                          },
                          TheSavior: { description: "Multiple completions" },
                          DoubleOrDie: { description: "Double or -10" },
                          PerfectBonus: { description: "50 point bonus" },
                        }).map(([key, boost]) => (
                          <option key={key} value={key}>
                            {key} - {boost.description}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={applyBoost}
                        style={{ marginBottom: "8px" }}
                        className="btn btn-primary btn-sm"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-2">
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <button
                  onClick={handleStartTheWeek}
                  style={styles.startWeekButton}
                  className="btn start-week-button"
                >
                  <i className="bi bi-calendar-week me-1"></i>
                  Start Week
                </button>
                <button
                  onClick={handleSaveProgress}
                  style={styles.saveProgressButton}
                  className="btn save-progress-button"
                >
                  <i className="bi bi-save me-1"></i>
                  Save Progress
                </button>
                {auth.currentUser?.email !== "admin@gmail.com" && (
                  <button
                    onClick={submitFeedback}
                    style={styles.feedbackButton}
                    className="btn feedback-button"
                    title="Share your feedback"
                  >
                    <i className="bi bi-chat-text-fill me-1"></i>
                    Feedback
                  </button>
                )}
              </div>
            </div>
            <div className="row mobile-column">
              <div className="col-12 mb-2">
                <div
                  style={styles.dashboardCard}
                  className="card dashboard-card"
                >
                  <div style={styles.cardBody} className="card-body">
                    <h6 style={styles.cardTitle}>Tasks</h6>
                    <div className="accordion">
                      {Object.entries(groupedTasks).map(
                        ([category, categoryTasks]) => (
                          <div className="accordion-item" key={category}>
                            <h2 className="accordion-header">
                              <button
                                className={`accordion-button ${
                                  !openSections[category] ? "collapsed" : ""
                                }`}
                                onClick={() => toggleSection(category)}
                                aria-expanded={openSections[category]}
                              >
                                {category} ({categoryTasks.length})
                              </button>
                            </h2>
                            <div
                              className={`accordion-collapse collapse ${
                                openSections[category] ? "show" : ""
                              }`}
                            >
                              <div style={{ padding: "8px" }}>
                                {categoryTasks.length > 0 ? (
                                  <ul className="list-group list-group-flush">
                                    {categoryTasks.map((task, taskIndex) => {
                                      const originalIndex =
                                        userData.tasks.findIndex(
                                          (t) => t.name === task.name
                                        );
                                      const taskId =
                                        globalTasks &&
                                        Object.keys(globalTasks).find(
                                          (key) =>
                                            globalTasks[key].name === task.name
                                        );
                                      const isBonusClaimable =
                                        task.completionCount >=
                                          task.numberLimit &&
                                        !task.bonusClaimed &&
                                        task.category !== "Bonus";
                                      return (
                                        <li
                                          key={taskIndex}
                                          style={styles.listGroupItem}
                                          className="list-group-item d-flex flex-column py-1 position-relative task-list-item"
                                          id={`task-${originalIndex}`}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            <span style={{ color: "#dc3545" }}>
                                              {task.name}
                                            </span>
                                            <div>
                                              <i
                                                className="bi bi-exclamation-circle-fill"
                                                style={{
                                                  cursor: "pointer",
                                                  color: "#007bff",
                                                }}
                                                onClick={() =>
                                                  showTaskDescription(taskId)
                                                }
                                              ></i>
                                              {task.boost && (
                                                <span
                                                  style={{
                                                    marginLeft: "4px",
                                                    padding: "2px 4px",
                                                    background: "#007bff",
                                                    color: "black",
                                                    borderRadius: "3px",
                                                    fontSize: "10px",
                                                  }}
                                                >
                                                  {task.boost}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              display: "flex",
                                              flexWrap: "wrap",
                                              alignItems: "center",
                                            }}
                                          >
                                            {task.hasExceptionalOption && (
                                              <select
                                                value={
                                                  task.selectedMode || "normal"
                                                }
                                                onChange={(e) =>
                                                  handleModeChange(
                                                    originalIndex,
                                                    e.target.value
                                                  )
                                                }
                                                style={styles.formSelectSm}
                                                className="me-1 mb-1 form-select-sm"
                                              >
                                                <option value="normal">
                                                  Normal
                                                </option>
                                                <option value="exceptional">
                                                  Exceptional
                                                </option>
                                                <option value="penalty">
                                                  Penalty
                                                </option>
                                              </select>
                                            )}
                                            {task.hasTimesOption && (
                                              <input
                                                type="number"
                                                min="1"
                                                value={
                                                  taskTimes[originalIndex] || ""
                                                }
                                                onChange={(e) =>
                                                  handleTimesChange(
                                                    originalIndex,
                                                    e.target.value
                                                  )
                                                }
                                                style={styles.timesInput}
                                                className="me-1 mb-1 times-input"
                                                placeholder="Times"
                                              />
                                            )}
                                            <button
                                              onClick={() =>
                                                completeTask(originalIndex)
                                              }
                                              style={{ margin: "0 4px 4px 0" }}
                                              className="btn btn-success btn-sm"
                                            >
                                              Complete
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleResetTaskCompletionCount(
                                                  originalIndex
                                                )
                                              }
                                              style={{ margin: "0 4px 4px 0" }}
                                              className="btn btn-warning btn-sm"
                                            >
                                              Reset
                                            </button>
                                            {task.boost && (
                                              <button
                                                onClick={() =>
                                                  removeBoost(originalIndex)
                                                }
                                                style={{ marginBottom: "4px" }}
                                                className="btn btn-danger btn-sm"
                                              >
                                                Remove
                                              </button>
                                            )}
                                            {task.boost === "DoubleOrDie" && (
                                              <button
                                                onClick={() =>
                                                  missTask(originalIndex)
                                                }
                                                style={{ marginBottom: "4px" }}
                                                className="btn btn-warning btn-sm"
                                              >
                                                Miss
                                              </button>
                                            )}
                                            {isBonusClaimable && (
                                              <button
                                                onClick={() =>
                                                  claimBonus(originalIndex)
                                                }
                                                style={{ marginBottom: "4px" }}
                                                className="btn btn-info btn-sm"
                                              >
                                                Claim Bonus
                                              </button>
                                            )}
                                          </div>
                                          <small style={styles.taskStats}>
                                            ({task.points} Pts
                                            {task.penaltyPoints || task.penalty
                                              ? ` / -${
                                                  task.penaltyPoints ||
                                                  task.penalty
                                                }`
                                              : ""}{" "}
                                            ) | Total: {task.completionCount}/
                                            {task.numberLimit} | Lifetime:{" "}
                                            {task.lifetimeCompletionCount}
                                          </small>
                                          {notifications
                                            .filter(
                                              (n) =>
                                                n.position ===
                                                `task-${originalIndex}`
                                            )
                                            .map((notification) => (
                                              <div
                                                key={notification.id}
                                                style={styles.taskNotification}
                                              >
                                                {notification.points
                                                  ? `${
                                                      notification.points > 0
                                                        ? "+"
                                                        : ""
                                                    }${notification.points}pts`
                                                  : ""}
                                              </div>
                                            ))}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p style={styles.noTasks}>
                                    No tasks in this category
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 mb-2">
                <div
                  style={styles.dashboardCard}
                  className="card dashboard-card"
                >
                  <div style={styles.cardBody} className="card-body">
                    <h6 style={styles.cardTitle}>Weekly Completed Tasks</h6>
                    {userData.completedTasks.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {userData.completedTasks.map((task, index) => (
                          <li
                            key={index}
                            style={
                              task.isPenalty
                                ? styles.penaltyListGroupItem
                                : styles.listGroupItem
                            }
                            className={`d-flex justify-content-between align-items-center py-1 ${
                              task.isPenalty
                                ? "penalty-list-group-item"
                                : "list-group-item"
                            }`}
                          >
                            <span>
                              <span
                                style={{ fontWeight: "bold", color: "#343a40" }}
                              >
                                {task.completionCount}x
                              </span>{" "}
                              {task.name}{" "}
                              <small style={{ color: "black" }}>
                                (Points: {task.points})
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
                      <p
                        style={{
                          textAlign: "center",
                          fontSize: "11px",
                          color: "#6c757d",
                        }}
                      >
                        No completed tasks this week.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {isAchievementsOpen && (
        <>
          <div style={styles.overlay} onClick={toggleAchievements}></div>
          <div style={styles.achievementsModal} className="achievements-modal">
            <h5 style={styles.achievementsTitle}>Achievements</h5>
            <button
              onClick={toggleAchievements}
              style={{ fontSize: "10px" }}
              className="btn btn-danger btn-sm float-end"
            >
              Close
            </button>
            <div style={styles.achievementsContainer}>
              {sortedCategories.map((category) => {
                const achievements =
                  JSON.parse(localStorage.getItem("achievements") || "{}")[
                    category
                  ] || [];
                return (
                  <div
                    key={category}
                    style={styles.achievementSection}
                    className="achievement-section"
                  >
                    <h6>
                      <button
                        className={`btn btn-link ${
                          !openAchievementSections[category] ? "collapsed" : ""
                        }`}
                        onClick={() => toggleAchievementSection(category)}
                        style={{ fontSize: "11px", textDecoration: "none" }}
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
                              }[userData.achievements[achievement.name].star]
                            : "#ccc";
                          return (
                            <li
                              key={achievement.name}
                              style={styles.listGroupItem}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <span
                                  style={
                                    isEarned ? styles.earnedAchievement : {}
                                  }
                                >
                                  {achievement.name} - {achievement.description}
                                </span>
                                <br />
                                <small style={{ fontSize: "9px" }}>
                                  Progress: {progress}/{achievement.target}{" "}
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
                                style={{ color: starColor, fontSize: "12px" }}
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
    </div>
  );
};

export default WeeklyModeMobile;
