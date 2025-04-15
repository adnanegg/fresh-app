import React from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useNormalModeLogic } from "./NormalModeLogic.js";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import Swal from "sweetalert2";

const WeeklyMode = ({ globalTasks, refreshGlobalTasks }) => {
  const {
    userData,
    notifications,
    openSections,
    isLoading,
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
    refreshGlobalTasks: refreshGlobalTasksFromLogic,
    claimBonus,
    adjustPoints,
    adjustMonthlyPoints,
    switchMode,
    missTask,
  } = useNormalModeLogic(globalTasks, refreshGlobalTasks, "weekly");

  const [openAchievementSections, setOpenAchievementSections] = React.useState(
    {}
  );

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

  const styles = {
    containerFluid: { padding: 0 },
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
      right: "0",
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
    progressText: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "white",
    },
    progressIcon: {
      fontSize: "30px",
      marginBottom: "10px",
      animation: "pulse 2s infinite ease-in-out",
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
    },
    profileSection: {
      position: "relative",
      padding: "10px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    switchButtonRow: { margin: "10px 0", textAlign: "center" },
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
  };

  const mobileStyles = `
    @media (max-width: 768px) {
      .container-fluid {
        padding: 0;
        min-height: 100vh;
      }
      .dashboard-content {
        margin-top: 60px;
        padding: 10px;
        flex: 1;
        z-index: 10;
      }
      .dashboard-card {
        border-radius: 8px;
        background: none;
        box-shadow: none;
      }
      .card-body {
        padding: 10px;
      }
      .card-title {
        font-size: 12px;
        font-weight: 600;
      }
      .list-group-item {
        background-color: transparent;
        border: none;
        font-size: 14px;
      }
      .penalty-list-group-item {
        background-color: rgba(139, 0, 0, 0.1);
        border: 1px solid #8b0000;
        color: #ff4040;
        font-weight: bold;
        padding: 6px;
        border-radius: 4px;
        font-size: 14px;
      }
      .form-select-sm {
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 4px;
        width: 100px;
      }
      .task-notification {
        position: absolute;
        top: -15px;
        right: 0;
        font-size: 10px;
        color: #28a745;
        font-weight: bold;
        animation: popUp 3s ease-out forwards;
      }
      .points-progress {
        text-align: center;
        padding: 10px;
        border-radius: 8px;
        background: linear-gradient(135deg, #ff6b6b, #007bff);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .monthly-points-progress {
        text-align: center;
        padding: 10px;
        border-radius: 8px;
        background: linear-gradient(135deg, #ff6b6b, #ffc107);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .progress-text {
        font-size: 18px;
        font-weight: bold;
        color: white;
      }
      .progress-icon {
        font-size: 20px;
        margin-bottom: 5px;
        animation: pulse 2s infinite ease-in-out;
      }
      .times-input {
        width: 60px;
        padding: 4px;
        font-size: 12px;
        border-radius: 4px;
        margin-left: 5px;
      }
      .start-week-button {
        margin: 5px;
        padding: 8px 16px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
      }
      .normalmodenav {
        position: fixed;
        top: 0;
        width: 100%;
        background: #ffc107;
        padding: 0.5rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 1000;
      }
      .profile-section {
        padding: 5px 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .switch-button-row {
        margin: 5px 0;
        text-align: center;
      }
      .achievements-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-height: 80vh;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 2000;
        overflow-y: auto;
      }
      .achievements-container {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      .achievement-section {
        margin: 5px 0;
      }
      .nav-brand img {
        width: 30px;
      }
      .nav-title {
        font-size: 14px;
      }
      .nav-links {
        font-size: 12px;
      }
      .nav-logout {
        padding: 2px 5px;
      }
      .task-list-item {
        flex-direction: column;
        align-items: flex-start;
      }
      .task-list-item .d-flex.align-items-center {
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
      }
      .task-list-item .d-flex.align-items-center > * {
        margin-bottom: 5px;
      }
      .task-list-item .d-flex:not(.align-items-center) {
        flex-wrap: wrap;
        gap: 5px;
      }
      .task-list-item small {
        font-size: 10px;
      }
      .mobile-column {
        flex-direction: column-reverse;
      }
    }
  `;

  const stylesString = `
    @keyframes popUp { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    ${mobileStyles}
  `;

  const toggleAchievementSection = (category) => {
    setOpenAchievementSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const sortedCategories = ["Average", "Advanced", "Master"];

  return (
    <div style={styles.containerFluid} className="container-fluid">
      <style>{stylesString}</style>
      <nav style={styles.normalmodenav} className="normalmodenav">
        <div className="nav-brand">
          <img
            src="/trackerLogo.png"
            alt="Logo"
            className="nav-logo"
            loading="lazy"
          />
          <span className="nav-title">Weekly Mode</span>
        </div>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">
            <i className="bi bi-house-fill"></i> Dashboard
          </Link>
          <Link to="/normal-mode" className="nav-link">
            <i className="bi bi-star-fill"></i> Program
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
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Syncing...</span>
            </div>
            <p className="mt-2">Syncing with server...</p>
          </div>
        ) : (
          <>
            <div className="row mb-4" style={styles.profileSection}>
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
                      <h4
                        style={styles.cardTitle}
                        className="text-dark fw-bold mb-1 card-title"
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-4" style={styles.switchButtonRow}>
              <button
                onClick={handleSwitchToDaily}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#17a2b8",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                }}
                className="btn"
              >
                Switch to Daily Tracker
              </button>
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
                    <h6 style={styles.cardTitle} className="card-title">
                      Points Progress
                    </h6>
                    <div
                      style={styles.pointsProgress}
                      className="points-progress"
                    >
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
                      <p style={styles.progressText} className="progress-text">
                        {userData.points.current} / {userData.points.total} pts
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button
                          onClick={() => adjustPoints(5)}
                          className="btn btn-success btn-sm"
                          style={{ marginTop: "50px" }}
                        >
                          +5pts
                        </button>
                        <button
                          onClick={() => adjustPoints(-5)}
                          className="btn btn-danger btn-sm"
                          style={{ marginTop: "50px" }}
                        >
                          −5pts
                        </button>
                      </div>
                      <button
                        onClick={resetPointsBar}
                        className="btn btn-warning w-100 mt-2"
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
                    <h6 style={styles.cardTitle} className="card-title">
                      Monthly Points Progress
                    </h6>
                    <div
                      style={styles.monthlyPointsProgress}
                      className="monthly-points-progress"
                    >
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
                      <p style={styles.progressText} className="progress-text">
                        {userData.Mpoints.current} / {userData.Mpoints.total}{" "}
                        pts
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button
                          onClick={() => adjustMonthlyPoints(5)}
                          className="btn btn-success btn-sm"
                          style={{ marginTop: "50px" }}
                        >
                          +5pts
                        </button>
                        <button
                          onClick={() => adjustMonthlyPoints(-5)}
                          className="btn btn-danger btn-sm"
                          style={{ marginTop: "50px" }}
                        >
                          −5pts
                        </button>
                      </div>
                      <button
                        onClick={resetMonthlyPointsBar}
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
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm dashboard-card"
                >
                  <div className="p-3">
                    <h6 style={{ fontSize: "16px", fontWeight: "bold" }}>
                      Apply a Boost
                    </h6>
                    <div className="d-flex align-items-center flex-wrap">
                      <select
                        value={selectedTaskIndex}
                        onChange={(e) => setSelectedTaskIndex(e.target.value)}
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
                      <button onClick={applyBoost} className="mb-2">
                        Apply Boost
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-4 justify-content-center" id="start-buttons">
              <div className="d-flex gap-3 justify-content-center">
                <button
                  onClick={startTheWeek}
                  style={styles.startWeekButton}
                  className="btn"
                  title="Start this week's tasks"
                >
                  <i className="bi bi-calendar-week me-2"></i>
                  Start This Week
                </button>
              </div>
            </div>
            <div className="row mobile-column">
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100 dashboard-card"
                  id="tasks"
                >
                  <div style={styles.cardBody} className="card-body">
                    <h6 style={styles.cardTitle} className="card-title">
                      Tasks
                    </h6>
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
                              <div className="accordion-body p-2">
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
                                          className="d-flex justify-content-between align-items-center py-1 position-relative task-list-item"
                                          id={`task-${originalIndex}`}
                                        >
                                          <div className="d-flex align-items-center">
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
                                              <span className="badge bg-primary ms-2">
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
                                                placeholder="Times"
                                                className="ms-2 times-input"
                                              />
                                            )}
                                            <br />
                                            <small className="text-muted">
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
                                          <div className="d-flex align-items-center">
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
                                                resetTaskCompletionCount(
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
                                  <p className="text-muted small">
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
                    <h6 style={styles.cardTitle} className="card-title">
                      Weekly Completed Tasks
                    </h6>
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
                              <span className="fw-bold text-dark">
                                {task.completionCount}x
                              </span>{" "}
                              {task.name}{" "}
                              <small className="text-muted ms-2">
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
                      <p className="text-muted text-center small">
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
          <div
            style={styles.overlay}
            onClick={toggleAchievements}
            className="overlay"
          ></div>
          <div style={styles.achievementsModal} className="achievements-modal">
            <h5>Achievements</h5>
            <button
              onClick={toggleAchievements}
              className="btn btn-danger float-end"
            >
              Close
            </button>
            <div
              style={styles.achievementsContainer}
              className="achievements-container"
            >
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
