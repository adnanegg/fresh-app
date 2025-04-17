import React, { useEffect, useState } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useNormalModeLogic } from "./NormalModeLogic";
import Swal from "sweetalert2";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const NormalModeMobile = ({ globalTasks, refreshGlobalTasks }) => {
  const navigate = useNavigate();
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
    resetCompletedTasks,
    resetAllTaskCompletionCount,
    resetPointsBar,
    resetMonthlyPointsBar,
    handleLogout,
    startTheWeek,
    startTheDay,
    getProgressColor,
    isAchievementsOpen,
    toggleAchievements,
    refreshGlobalTasks: refreshGlobalTasksFromLogic,
    switchMode,
    adjustMonthlyPoints,
    adjustPoints,
    syncWithFirebase,
    normalTutorialMessages,
    sendGlobalNotification,
    submitFeedback,
    viewFeedback,
    applyGlobalBoost,
    startWeekForAllUsers,
  } = useNormalModeLogic(globalTasks, refreshGlobalTasks, "daily");

  const [openAchievementSections, setOpenAchievementSections] = useState({});
  const [isWeeklyTasksOpen, setIsWeeklyTasksOpen] = useState(false);

  const [showTutorial, setShowTutorial] = useState(false);
  const [dontShowTutorial, setDontShowTutorial] = useState(false);
  const [adminSelectedTaskId, setAdminSelectedTaskId] = useState("");
  const [adminSelectedBoost, setAdminSelectedBoost] = useState("");
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    return (
      JSON.parse(
        localStorage.getItem(`dismissedNotifications_${auth.currentUser?.uid}`)
      ) || []
    );
  });

  const contentHash = JSON.stringify(normalTutorialMessages);

  // Handle tutorial visibility and content change
  useEffect(() => {
    const storedHash = localStorage.getItem("tutorialContentHash");
    const storedDontShow = localStorage.getItem("dontShowTutorial") === "true";

    if (storedHash !== contentHash) {
      localStorage.setItem("tutorialContentHash", contentHash);
      localStorage.removeItem("dontShowTutorial");
      setShowTutorial(true);
    } else if (!storedDontShow) {
      setShowTutorial(true);
    }
    setDontShowTutorial(storedDontShow);
  }, [contentHash]);

  const dismissNotification = (notificationId) => {
    setDismissedNotifications((prev) => [...prev, notificationId]);
  };
  // Handle checkbox toggle
  const handleDontShowChange = (e) => {
    const checked = e.target.checked;
    setDontShowTutorial(checked);
    localStorage.setItem("dontShowTutorial", checked);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      syncWithFirebase(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [syncWithFirebase]);

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

  const styles = {
    containerFluid: {
      padding: 0,
      minHeight: "100vh",
      overflowX: "hidden",
      position: "relative",
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
    dashboardContent: {
      marginTop: "50px",
      padding: "8px",
      flex: 1,
      zIndex: 10,
    },
    dashboardCard: {
      borderRadius: "6px",
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
    },
    cardBody: { padding: "8px" },
    cardTitle: { fontSize: "11px", fontWeight: 600, color: "black" },
    listGroupItem: {
      backgroundColor: "transparent",
      border: "none",
      fontSize: "12px",
      color: "black",
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
      right: "0",
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
    progressText: { fontSize: "16px", fontWeight: "bold", color: "black" },
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
      transition: "transform 0.2s, background 0.2s",
      zIndex: 5,
    },
    startDayButton: {
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
      transition: "transform 0.2s, background 0.2s",
      zIndex: 5,
    },
    normalmodenav: {
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
    profileSection: {
      padding: "4px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
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
    achievementSection: { margin: "4px 0" },
    tutorialModal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "90%",
      maxWidth: "300px",
      background: "linear-gradient(135deg, #007bff, #28a745)",
      color: "white",
      padding: "12px",
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      zIndex: 2002,
      fontFamily: "'Arial', sans-serif",
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
      fontSize: "11px",
      lineHeight: "1.4",
      marginBottom: "12px",
    },
    tutorialCheckbox: {
      marginRight: "8px",
    },
    tutorialButton: {
      backgroundColor: "#ffc107",
      color: "#000",
      padding: "6px 12px",
      border: "none",
      borderRadius: "3px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "11px",
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
  };

  const stylesString = `
    @keyframes popUp { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .switch-button:hover {
      transform: scale(1.05);
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
    .feedback-button:hover, .feedback-button:active {
      transform: scale(1.05);
      background: linear-gradient(135deg, #0056b3, #003d80);
    }
    .apply-global-boost-button {
      margin: 4px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #dc3545, #a71d2a);
      color: white;
      border: none;
      borderRadius: 3px;
      fontSize: 11px;
      minWidth: 44px;
      minHeight: 44px;
      transition: transform 0.2s, background 0.2s;
    }
    .apply-global-boost-button:hover, .apply-global-boost-button:active {
      transform: scale(1.05);
      background: linear-gradient(135deg, #a71d2a, #7a1a1f);
    }  
  `;

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
    <div style={styles.containerFluid}>
      {isSyncing && (
        <div style={styles.syncOverlay}>Syncing, please wait...</div>
      )}
      {showTutorial && (
        <>
          <div
            style={styles.tutorialOverlay}
            onClick={() => setShowTutorial(false)}
          ></div>
          <div style={styles.tutorialModal} className="tutorial-modal">
            <h3 style={{ marginBottom: "20px", fontWeight: "bold" }}>
              Welcome to Daily Mode
            </h3>
            <div style={styles.tutorialContent}>
              <ul style={{ paddingLeft: "20px" }}>
                {normalTutorialMessages.map((msg, index) => (
                  <li key={index} style={{ marginBottom: "10px" }}>
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <input
                type="checkbox"
                checked={dontShowTutorial}
                onChange={handleDontShowChange}
                style={styles.tutorialCheckbox}
                id="dontShowTutorial"
              />
              <label htmlFor="dontShowTutorial">Don't show this again</label>
            </div>
            <button
              onClick={() => setShowTutorial(false)}
              style={styles.tutorialButton}
            >
              Got It!
            </button>
          </div>
        </>
      )}
      {notifications
        .filter((n) => n.global && !dismissedNotifications.includes(n.id))
        .map((notification) => (
          <React.Fragment key={notification.id}>
            <div
              style={styles.tutorialOverlay}
              onClick={() => dismissNotification(notification.id)}
            ></div>
            <div
              style={styles.notificationModal}
              className="notification-modal"
            >
              <h3
                style={{
                  marginBottom: "12px",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Notification
              </h3>
              <div style={styles.tutorialContent}>{notification.message}</div>
              <button
                onClick={() => dismissNotification(notification.id)}
                style={styles.notificationButton}
              >
                Close
              </button>
            </div>
          </React.Fragment>
        ))}
      <video autoPlay loop muted style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={styles.videoOverlay}></div>
      <style>{stylesString}</style>
      <nav style={styles.normalmodenav}>
        <div className="nav-brand">
          <img src="/trackerLogo.png" alt="Logo" style={{ width: "25px" }} />
          <span className="nav-title" style={{ fontSize: "12px" }}>
            Program
          </span>
        </div>
        <div className="nav-links" style={{ fontSize: "11px" }}>
          <Link to="/dashboard" className="nav-link">
            <i className="bi bi-house-fill"></i>
          </Link>
          <Link to="/normal-mode" className="nav-link">
            <i className="bi bi-star-fill"></i>
          </Link>
          <Link to="/gamepage" className="nav-link">
            <i className="bi bi-dice-6-fill"></i>
          </Link>
          <Link to="/statistics" className="nav-link">
            <i className="bi bi-bar-chart-fill"></i>
          </Link>
          <button onClick={toggleAchievements} className="nav-link">
            <i className="bi bi-trophy-fill"></i>
          </button>
          <button
            onClick={handleSwitchToWeekly}
            style={styles.switchButton}
            className="nav-link switch-button"
            title="Switch to Weekly Mode"
          >
            <i className="bi bi-arrow-repeat me-1"></i>
            Weekly
          </button>
          <button
            onClick={handleLogout}
            className="nav-logout"
            style={{ padding: "2px 4px", minWidth: "44px", minHeight: "44px" }}
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </nav>
      <div style={styles.dashboardContent}>
        {isLoading ? (
          <div className="text-center py-4">
            <div
              className="spinner-border text-primary"
              role="status"
              style={{ width: "1.5rem", height: "1.5rem" }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2" style={{ fontSize: "12px", color: "black" }}>
              Loading tasks...
            </p>
          </div>
        ) : (
          <>
            {/* Profile, Points, and Monthly Points in One Row */}
            <div className="row mb-2">
              <div className="col-12 mb-2">
                <div style={styles.dashboardCard} className="card">
                  <div style={styles.cardBody} className="text-center p-2">
                    <h4
                      style={{ ...styles.cardTitle, fontSize: "14px" }}
                      className="text-dark fw-bold mb-1"
                    >
                      {userData.profile.name}
                    </h4>
                    <p className="text-muted" style={{ fontSize: "9px" }}>
                      User ID: {auth.currentUser?.uid?.slice(0, 8)}...
                    </p>
                    <div className="mt-1">
                      <span className="me-2">
                        <i
                          className="bi bi-star-fill"
                          style={{ color: "#cd7f32", fontSize: "12px" }}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "bronze"
                          ).length
                        }
                      </span>
                      <span className="me-2">
                        <i
                          className="bi bi-star-fill"
                          style={{ color: "#c0c0c0", fontSize: "12px" }}
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
                          style={{ color: "#ffd700", fontSize: "12px" }}
                        ></i>{" "}
                        {
                          Object.values(userData.achievements).filter(
                            (a) => a.star === "gold"
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 mb-2">
                <div style={styles.dashboardCard} className="card">
                  <div style={styles.cardBody} className="p-2 text-center">
                    <h6 style={styles.cardTitle}>Points</h6>
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
                        {userData.points.current}/{userData.points.total}
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-1">
                        <button
                          onClick={() => adjustPoints(5)}
                          className="btn btn-success btn-sm"
                          style={{ fontSize: "9px", minHeight: "30px" }}
                        >
                          +5pts
                        </button>
                        <button
                          onClick={() => adjustPoints(-5)}
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: "9px", minHeight: "30px" }}
                        >
                          −5pts
                        </button>
                      </div>
                      <button
                        onClick={resetPointsBar}
                        className="btn btn-warning btn-sm w-100 mt-1"
                        style={{ fontSize: "9px", minHeight: "30px" }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 mb-2">
                <div style={styles.dashboardCard} className="card">
                  <div style={styles.cardBody} className="p-2 text-center">
                    <h6 style={styles.cardTitle}>Monthly</h6>
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
                        {userData.Mpoints.current}/{userData.Mpoints.total}
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-1">
                        <button
                          onClick={() => adjustMonthlyPoints(5)}
                          className="btn btn-success btn-sm"
                          style={{ fontSize: "9px", minHeight: "30px" }}
                        >
                          +5pts
                        </button>
                        <button
                          onClick={() => adjustMonthlyPoints(-5)}
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: "9px", minHeight: "30px" }}
                        >
                          −5pts
                        </button>
                      </div>
                      <button
                        onClick={resetMonthlyPointsBar}
                        className="btn btn-warning btn-sm w-100 mt-1"
                        style={{ fontSize: "9px", minHeight: "30px" }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {auth.currentUser?.email === "admin@gmail.com" && (
              <div className="row mb-2">
                <div className="col-12">
                  <div style={styles.dashboardCard} className="card">
                    <div className="p-2">
                      <h6
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          color: "black",
                        }}
                      >
                        Admin: Global Controls
                      </h6>
                      <div className="d-flex align-items-center flex-wrap">
                        <select
                          value={adminSelectedTaskId}
                          onChange={(e) =>
                            setAdminSelectedTaskId(e.target.value)
                          }
                          className="mb-2 me-2"
                          style={{ fontSize: "11px", height: "30px" }}
                        >
                          <option value="">Select Task</option>
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
                          className="mb-2 me-2"
                          style={{ fontSize: "11px", height: "30px" }}
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
                          onClick={() =>
                            applyGlobalBoost(
                              adminSelectedTaskId,
                              adminSelectedBoost
                            )
                          }
                          className="mb-2 me-2 apply-global-boost-button"
                        >
                          Apply Globally
                        </button>
                        <button
                          onClick={startWeekForAllUsers}
                          className="mb-2 me-2 apply-global-boost-button"
                        >
                          Start Week for All
                        </button>
                        <button
                          onClick={sendGlobalNotification}
                          className="mb-2 me-2 apply-global-boost-button"
                        >
                          Send Notification
                        </button>
                        <button
                          onClick={viewFeedback}
                          className="mb-2 apply-global-boost-button"
                        >
                          View Feedback
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Apply Boost Section */}
            <div className="row mb-2">
              <div className="col-12">
                <div style={styles.dashboardCard} className="card">
                  <div className="p-2">
                    <h6
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "black",
                      }}
                    >
                      Apply Boost
                    </h6>
                    <div className="d-flex align-items-center flex-wrap">
                      <select
                        value={selectedTaskIndex}
                        onChange={(e) => setSelectedTaskIndex(e.target.value)}
                        className="mb-2 me-2"
                        style={{ fontSize: "11px", height: "30px" }}
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
                        className="mb-2 me-2"
                        style={{ fontSize: "11px", height: "30px" }}
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
                        className="btn btn-primary btn-sm mb-2"
                        style={{ fontSize: "11px", minHeight: "30px" }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Buttons */}
            <div className="row mb-2">
              <div className="d-flex justify-content-between flex-wrap">
                <button
                  onClick={startTheDay}
                  style={styles.startDayButton}
                  className="btn start-day-button"
                >
                  <i className="bi bi-sunrise me-1"></i>
                  Start Today
                </button>
                <button
                  onClick={startTheWeek}
                  style={styles.startWeekButton}
                  className="btn start-week-button"
                >
                  <i className="bi bi-calendar-week me-1"></i>
                  Start Week
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
                    <i className="bi bi-chat-text-fill me-1"></i>
                    Feedback
                  </button>
                )}
              </div>
            </div>

            {/* Daily Tasks and Completed Tasks */}
            <div className="row mobile-column">
              <div className="col-12 mb-2">
                <div style={styles.dashboardCard} className="card">
                  <div style={styles.cardBody}>
                    <h6 style={styles.cardTitle}>Daily Tasks</h6>
                    <div className="accordion">
                      {Object.entries(groupedTasks).map(
                        ([category, categoryTasks]) => (
                          <div
                            className="accordion-item"
                            key={category}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(255, 255, 255, 0.3)",
                              boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
                            }}
                          >
                            <h2 className="accordion-header">
                              <button
                                className={`accordion-button ${
                                  !openSections[category] ? "collapsed" : ""
                                }`}
                                onClick={() => toggleSection(category)}
                                aria-expanded={openSections[category]}
                                style={{
                                  fontSize: "11px",
                                  background: "transparent",
                                  color: "black",
                                }}
                              >
                                {category} ({categoryTasks.length})
                              </button>
                            </h2>
                            <div
                              className={`accordion-collapse collapse ${
                                openSections[category] ? "show" : ""
                              }`}
                            >
                              <div className="accordion-body p-2">
                                {categoryTasks.length > 0 ? (
                                  <ul className="list-group list-group-flush">
                                    {categoryTasks.map((task, taskIndex) => {
                                      const originalIndex =
                                        userData.tasks.findIndex(
                                          (t) => t.name === task.name
                                        );
                                      const isCompleteDisabled =
                                        task.dailyCounter >= task.dailyLimit;
                                      return (
                                        <li
                                          key={taskIndex}
                                          style={styles.listGroupItem}
                                          className="d-flex flex-column py-1 position-relative"
                                          id={`task-${originalIndex}`}
                                        >
                                          <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span style={{ color: "#dc3545" }}>
                                              {task.name}
                                            </span>
                                            {task.boost && (
                                              <span
                                                className="badge bg-primary ms-1"
                                                style={{ fontSize: "9px" }}
                                              >
                                                {task.boost}
                                              </span>
                                            )}
                                          </div>
                                          <div className="d-flex flex-wrap align-items-center">
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
                                                className="me-1 mb-1"
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
                                                placeholder="Times"
                                                className="me-1 mb-1"
                                              />
                                            )}
                                            <button
                                              onClick={() =>
                                                completeTask(originalIndex)
                                              }
                                              className="btn btn-success btn-sm me-1 mb-1"
                                              disabled={isCompleteDisabled}
                                              style={{
                                                fontSize: "9px",
                                                minHeight: "30px",
                                              }}
                                            >
                                              Complete
                                            </button>
                                            <button
                                              onClick={() =>
                                                resetTaskCompletionCount(
                                                  originalIndex
                                                )
                                              }
                                              className="btn btn-warning btn-sm me-1 mb-1"
                                              style={{
                                                fontSize: "9px",
                                                minHeight: "30px",
                                              }}
                                              disabled={isCompleteDisabled}
                                            >
                                              Reset
                                            </button>
                                            {task.boost && (
                                              <button
                                                onClick={() =>
                                                  removeBoost(originalIndex)
                                                }
                                                className="btn btn-danger btn-sm mb-1"
                                                style={{
                                                  fontSize: "9px",
                                                  minHeight: "30px",
                                                }}
                                              >
                                                Remove
                                              </button>
                                            )}
                                          </div>
                                          <small
                                            className="text-muted"
                                            style={{ fontSize: "9px" }}
                                          >
                                            ({task.points} Pts
                                            {task.penaltyPoints || task.penalty
                                              ? ` / -${
                                                  task.penaltyPoints ||
                                                  task.penalty
                                                }`
                                              : ""}{" "}
                                            ) | Total: {task.completionCount}/
                                            {task.numberLimit}| Lifetime:{" "}
                                            {task.lifetimeCompletionCount} |
                                            Daily: {task.dailyCounter}/
                                            {task.dailyLimit}
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
                                                className="task-notification"
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
                                    className="text-muted small"
                                    style={{ fontSize: "11px", color: "black" }}
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
              <div className="col-12 mb-2">
                <div style={styles.dashboardCard} className="card">
                  <div style={styles.cardBody}>
                    <h6 style={styles.cardTitle}>Daily Completed Tasks</h6>
                    {userData.completedTasks.length > 0 ? (
                      <ul className="list-group list-group-flush">
                        {userData.completedTasks
                          .filter((task) => task.dailyCounter > 0)
                          .map((task, index) =>
                            task.isPenalty ? (
                              <li
                                key={index}
                                style={styles.penaltyListGroupItem}
                                className="d-flex justify-content-between align-items-center py-1"
                              >
                                <span>
                                  {task.name}{" "}
                                  <span className="fw-bold">Penalized</span>
                                </span>
                                <button
                                  onClick={() => undoTask(index)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontSize: "9px", minHeight: "30px" }}
                                >
                                  Undo
                                </button>
                              </li>
                            ) : (
                              <li
                                key={index}
                                style={styles.listGroupItem}
                                className="d-flex justify-content-between align-items-center py-1"
                              >
                                <span>
                                  <span className="fw-bold text-dark">
                                    {task.dailyCounter}x
                                  </span>{" "}
                                  {task.name}{" "}
                                  <small className="text-muted">
                                    ({task.dailyCounter}/{task.dailyLimit})
                                  </small>
                                </span>
                                <button
                                  onClick={() => undoTask(index)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontSize: "9px", minHeight: "30px" }}
                                >
                                  Undo
                                </button>
                              </li>
                            )
                          )}
                      </ul>
                    ) : (
                      <p
                        className="text-muted text-center small"
                        style={{ fontSize: "11px", color: "black" }}
                      >
                        No completed tasks today.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12 mb-2">
                <div style={styles.dashboardCard} className="card">
                  <div style={styles.cardBody}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 style={styles.cardTitle}>
                        This Week Completed Tasks
                      </h6>
                      <button
                        onClick={() => setIsWeeklyTasksOpen(!isWeeklyTasksOpen)}
                        className="btn btn-sm btn-outline-primary"
                        style={{ fontSize: "9px", minHeight: "30px" }}
                      >
                        {isWeeklyTasksOpen ? "Hide" : "Show"}
                      </button>
                    </div>
                    {isWeeklyTasksOpen &&
                      (userData.completedTasks.length > 0 ? (
                        <ul className="list-group list-group-flush">
                          {userData.completedTasks.map((task, index) =>
                            task.isPenalty ? (
                              <li
                                key={index}
                                style={styles.penaltyListGroupItem}
                                className="d-flex justify-content-between align-items-center py-1"
                              >
                                <span>
                                  {task.name}{" "}
                                  <span className="fw-bold">Penalized</span>
                                </span>
                                <button
                                  onClick={() => undoTask(index)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontSize: "9px", minHeight: "30px" }}
                                >
                                  Undo
                                </button>
                              </li>
                            ) : (
                              <li
                                key={index}
                                style={styles.listGroupItem}
                                className="d-flex justify-content-between align-items-center py-1"
                              >
                                <span>
                                  <span className="fw-bold text-dark">
                                    {task.completionCount}x
                                  </span>{" "}
                                  {task.name}{" "}
                                  <small className="text-muted">
                                    ({task.dailyCounter}/{task.dailyLimit})
                                  </small>
                                </span>
                                <button
                                  onClick={() => undoTask(index)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontSize: "9px", minHeight: "30px" }}
                                >
                                  Undo
                                </button>
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p
                          className="text-muted text-center small"
                          style={{ fontSize: "11px", color: "black" }}
                        >
                          No completed tasks this week.
                        </p>
                      ))}
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
          <div style={styles.achievementsModal}>
            <h5 style={{ fontSize: "12px", color: "white" }}>Achievements</h5>
            <button
              onClick={toggleAchievements}
              className="btn btn-danger btn-sm float-end"
              style={{ fontSize: "9px", minHeight: "30px" }}
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
                  <div key={category} style={styles.achievementSection}>
                    <h6>
                      <button
                        className={`btn btn-link ${
                          !openAchievementSections[category] ? "collapsed" : ""
                        }`}
                        onClick={() => toggleAchievementSection(category)}
                        style={{
                          textDecoration: "none",
                          color: "white",
                          fontSize: "11px",
                        }}
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
                              className="list-group-item d-flex justify-content-between align-items-center"
                              style={{
                                fontSize: "11px",
                                background: "transparent",
                                border: "none",
                                color: "black",
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    fontWeight: isEarned ? "bold" : "normal",
                                    color: isEarned ? "#28a745" : "black",
                                  }}
                                >
                                  {achievement.name} - {achievement.description}
                                </span>
                                <br />
                                <small
                                  style={{ fontSize: "9px", color: "black" }}
                                >
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

export default NormalModeMobile;
