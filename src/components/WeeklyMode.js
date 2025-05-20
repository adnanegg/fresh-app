import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useNormalModeLogic } from "./NormalModeLogic";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const WeeklyMode = ({ globalTasks, refreshGlobalTasks }) => {
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
    removeNotification,
    submitFeedback,
    isReady,
    setIsReady,
    handleReadyChange,
  } = useNormalModeLogic(globalTasks, refreshGlobalTasks, "weekly");

  const [openAchievementSections, setOpenAchievementSections] = React.useState(
    {}
  );

  // Clean up notifications after 1.5 seconds
  useEffect(() => {
    const timers = notifications.map((notification) => {
      return setTimeout(() => {
        removeNotification(notification.id);
      }, 1500);
    });
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [notifications, removeNotification]);

  // Sync every 10 seconds
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
  const styles = {
    container: { padding: 0 },
    dashboardContent: {
      marginTop: "60px",
      flex: 1,
      zIndex: 10,
      justifyContent: "center",
    },
    dashboardCard: {
      borderRadius: "8px",
      background: "none",
      boxShadow: "none",
    },
    cardBody: { padding: "12px" },
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
    },
    taskNotification: {
      position: "absolute",
      top: "-20px",
      right: 0,
      fontSize: "12px",
      color: "#28a745",
      fontWeight: "bold",
      animation: "popUp 3s ease-out forwards",
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
    progressText: { fontSize: "24px", fontWeight: "bold", color: "white" },
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
      padding: "8px",
      fontSize: "16px",
      borderRadius: "6px",
      marginLeft: "10px",
    },
    startWeekButton: {
      margin: "10px",
      padding: "10px 20px",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "6px",
    },
    saveProgressButton: {
      margin: "10px",
      padding: "8px 16px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "6px",
      transition: "background-color 0.2s",
    },
    saveProgressButtonSaving: {
      backgroundColor: "#0056b3",
      animation: "pulse 1.5s infinite ease-in-out",
    },
    normalModeNav: {
      position: "fixed",
      top: 0,
      width: "100%",
      background: "#ffc107",
      padding: "1rem 2rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 1000,
    },
    profileSection: {
      position: "relative",
      padding: "10px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    switchButtonRow: { margin: "10px 0", textAlign: "center" },
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
    applyBoostTitle: { fontSize: "16px", fontWeight: "bold" },
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
      fontFamily: "'Arial', sans-serif",
    },
    notificationButton: {
      backgroundColor: "#dc3545",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
    },
    readyCheckbox: { marginLeft: "10px", verticalAlign: "middle" },
    readyLabel: {
      fontSize: "14px",
      color: "#333",
      marginLeft: "5px",
      verticalAlign: "middle",
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
    },
  };

  const stylesString = `
    @keyframes popUp { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .start-week-button:hover { transform: scale(1.05); background: linear-gradient(135deg, #1e7e34, #155927); }
    .save-progress-button:hover { transform: scale(1.05); background: #0056b3; }
    .feedback-button:hover { transform: scale(1.05); background: linear-gradient(135deg, #0056b3, #003d80); }
    .switch-button:hover { transform: scale(1.05); background: linear-gradient(135deg, #117a8b, #0d5f6e); }
    .btn-success:hover { transform: scale(1.05); background: #218838; }
    .btn-danger:hover { transform: scale(1.05); background: #c82333; }
    .btn-warning:hover { transform: scale(1.05); background: #e0a800; }
    .btn-info:hover { transform: scale(1.05); background: #138496; }
    .btn-primary:hover { transform: scale(1.05); background: #0069d9; }
    .nav-logout:hover { transform: scale(1.05); background: #dc3545; }
    .ready-checkbox:hover + .ready-label { color: #007bff; }
  `;

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

  const sortedCategories = ["Average", "Advanced", "Master"];

  return (
    <div style={styles.container} className="container-fluid">
      <video autoPlay muted loop style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
      </video>
      <div style={styles.videoOverlay}></div>
      {isSyncing && (
        <div style={styles.syncOverlay}>Syncing, please wait...</div>
      )}
      <style>{stylesString}</style>
      <nav style={styles.normalModeNav} className="normalmodenav">
        <div className="nav-brand">
          <img
            src="/trackerLogo.png"
            alt="Logo"
            style={{ width: "30px" }}
            loading="lazy"
          />
          <span style={{ fontSize: "16px", marginLeft: "10px" }}>
            Weekly Mode
          </span>
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
            onClick={handleSwitchToDaily}
            style={styles.switchButton}
            className="nav-link switch-button"
            title="Switch to Daily Mode"
          >
            <i className="bi bi-arrow-repeat me-2"></i>Switch to Daily Mode
          </button>
          <button onClick={handleLogout} className="nav-logout">
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </nav>
      <div
        style={styles.dashboardContent}
        className="col p-4 dashboard-content"
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Syncing...</span>
            </div>
            <p style={{ marginTop: "10px" }}>Syncing with server...</p>
          </div>
        ) : (
          <>
            <div
              style={styles.profileSection}
              className="row mb-4 profile-section"
            >
              <div className="col-12 col-md-6">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm dashboard-card"
                >
                  <div
                    style={styles.cardBody}
                    className="text-center p-3 d-flex align-items-center justify-content-center card-body"
                  >
                    <div>
                      <h4 style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        {userData.profile.name}
                      </h4>
                      <p style={{ fontSize: "12px", color: "#6c757d" }}>
                        User ID: {userData?.uid?.slice(0, 8)}...
                      </p>
                      <div style={{ marginTop: "10px" }}>
                        <span style={{ marginRight: "15px" }}>
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
                        <span style={{ marginRight: "15px" }}>
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
                            onChange={(e) =>
                              handleReadyChange(e.target.checked)
                            }
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
              </div>
            </div>
            {/* Important Section */}
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
            <div className="row mb-4">
              <div className="col-12 col-md-4 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm dashboard-card"
                >
                  <div
                    style={styles.cardBody}
                    className="p-3 text-center card-body"
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
                        {userData.points.current} / {userData.points.total} pts
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "10px",
                          marginTop: "10px",
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
                      <button
                        onClick={handleResetPointsBar}
                        style={{ marginTop: "10px", width: "100%" }}
                        className="btn btn-warning"
                      >
                        Reset Points
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm dashboard-card"
                >
                  <div
                    style={styles.cardBody}
                    className="p-3 text-center card-body"
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
                        {userData.Mpoints.current} / {userData.Mpoints.total}{" "}
                        pts
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "10px",
                          marginTop: "10px",
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
                      <button
                        onClick={handleResetMonthlyPointsBar}
                        style={{ marginTop: "10px", width: "100%" }}
                        className="btn btn-warning"
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
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm dashboard-card"
                >
                  <div style={{ padding: "12px" }}>
                    <h6 style={styles.applyBoostTitle}>Apply a Boost</h6>
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
                        className="me-2 mb-2 form-select-sm"
                      >
                        <option value="">Select a Task</option>
                        {userData.tasks.map(
                          (task, originalIndex) =>
                            task.category === "Task" && (
                              <option key={originalIndex} value={originalIndex}>
                                {task.name}{" "}
                                {task.boost ? `(${task.boost})` : ""}
                              </option>
                            )
                        )}
                      </select>
                      <select
                        value={selectedBoost}
                        onChange={(e) => setSelectedBoost(e.target.value)}
                        style={styles.formSelectSm}
                        className="me-2 mb-2 form-select-sm"
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
                        onClick={applyBoost}
                        style={{ marginBottom: "10px" }}
                        className="btn btn-primary"
                      >
                        Apply Boost
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-4 justify-content-center" id="start-buttons">
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={handleStartTheWeek}
                  style={styles.startWeekButton}
                  className="btn start-week-button"
                  title="Start this week's tasks"
                >
                  <i className="bi bi-calendar-week me-2"></i>Start This Week
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
                {auth.currentUser?.email !== "admin@gmail.com" && (
                  <button
                    onClick={submitFeedback}
                    style={styles.feedbackButton}
                    className="btn feedback-button"
                    title="Share your feedback"
                  >
                    <i className="bi bi-chat-text-fill me-2"></i>Give Feedback
                  </button>
                )}
              </div>
            </div>
            <div className="row">
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100 dashboard-card"
                  id="tasks"
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
                                } text-dark`}
                                onClick={() => toggleSection(category)}
                                aria-expanded={openSections[category]}
                              >
                                {category} ({categoryTasks.length} tasks)
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
                                          className="list-group-item d-flex justify-content-between align-items-center py-1 position-relative task-list-item"
                                          id={`task-${originalIndex}`}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                            }}
                                          >
                                            <span style={{ color: "#dc3545" }}>
                                              {task.name}
                                            </span>
                                            <i
                                              className="bi bi-exclamation-circle-fill ms-2"
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
                                                  marginLeft: "5px",
                                                  padding: "2px 5px",
                                                  background: "#007bff",
                                                  color: "white",
                                                  borderRadius: "4px",
                                                }}
                                              >
                                                {task.boost}
                                              </span>
                                            )}
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
                                                className="ms-2 form-select-sm"
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
                                                className="ms-2 times-input"
                                                placeholder="Times"
                                              />
                                            )}
                                            <br />
                                            <small style={{ color: "#6c757d" }}>
                                              ({task.points} Points{" "}
                                              {task.penaltyPoints ||
                                              task.penalty
                                                ? ` / -${
                                                    task.penaltyPoints ||
                                                    task.penalty
                                                  } Penalty`
                                                : ""}
                                              ) | Total: {task.completionCount}/
                                              {task.numberLimit} | Lifetime:{" "}
                                              {task.lifetimeCompletionCount}
                                            </small>
                                          </div>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                            }}
                                          >
                                            <button
                                              onClick={() =>
                                                completeTask(originalIndex)
                                              }
                                              className="btn btn-success btn-sm me-1"
                                            >
                                              Complete
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleResetTaskCompletionCount(
                                                  originalIndex
                                                )
                                              }
                                              className="btn btn-warning btn-sm me-1"
                                            >
                                              Reset
                                            </button>
                                            {task.boost && (
                                              <button
                                                onClick={() =>
                                                  removeBoost(originalIndex)
                                                }
                                                className="btn btn-danger btn-sm me-1"
                                              >
                                                Remove Boost
                                              </button>
                                            )}
                                            {task.boost === "DoubleOrDie" && (
                                              <button
                                                onClick={() =>
                                                  missTask(originalIndex)
                                                }
                                                className="btn btn-warning btn-sm me-1"
                                              >
                                                Miss
                                              </button>
                                            )}
                                            {isBonusClaimable && (
                                              <button
                                                onClick={() =>
                                                  claimBonus(originalIndex)
                                                }
                                                className="btn btn-info btn-sm"
                                              >
                                                Claim Bonus
                                              </button>
                                            )}
                                          </div>
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
                                  <p
                                    style={{
                                      fontSize: "12px",
                                      color: "#6c757d",
                                    }}
                                  >
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
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100 dashboard-card"
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
                              <small style={{ color: "#6c757d" }}>
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
                          fontSize: "12px",
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
                                  style={{
                                    fontWeight: isEarned ? "bold" : "normal",
                                    color: isEarned ? "#28a745" : "#000",
                                  }}
                                >
                                  {achievement.name} - {achievement.description}
                                </span>
                                <br />
                                <small>
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
                                style={{ color: starColor, fontSize: "20px" }}
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

export default WeeklyMode;
