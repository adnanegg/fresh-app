import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { useNormalModeLogic } from "./NormalModeLogic";
import { GLOBAL_TASKS } from "./tasks";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import Swal from "sweetalert2";

const NormalMode = ({ globalTasks, refreshGlobalTasks }) => {
  const navigate = useNavigate();
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
  } = useNormalModeLogic(globalTasks, refreshGlobalTasks);

  const [openAchievementSections, setOpenAchievementSections] = React.useState(
    {}
  );
  const [isWeeklyTasksOpen, setIsWeeklyTasksOpen] = React.useState(false);

  const showTaskDescription = (taskId) => {
    const task = GLOBAL_TASKS[taskId];
    if (!task) return;
    Swal.fire({
      title: task.name,
      text: `Summary: ${task.summary || "No summary"}\nPoints: ${
        task.points
      }\nDaily Limit: ${task.dailyLimit}\nPenalty: ${
        task.penalty || task.penaltyPoints || "None"
      }\nWeekly Goal: ${task.numberLimit} times`,
      icon: "info",
    });
  };

  const styles = {
    containerFluid: { padding: 0 },
    dashboardContent: { marginTop: "60px", flex: 1, zIndex: 10 },
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
    startDayButton: {
      margin: "10px",
      padding: "10px 20px",
      backgroundColor: "#007bff",
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

  const stylesString = `
    @keyframes popUp { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
  `;

  const toggleAchievementSection = (category) => {
    setOpenAchievementSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const sortedCategories = ["Average", "Advanced", "Master"];

  // Group completed tasks by day within the week
  const groupTasksByDay = () => {
    const weekStart = new Date(userData.weekStart);
    const today = new Date();
    const daysInWeek = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      if (day > today) break;
      daysInWeek.push(day.toDateString());
    }

    const grouped = {};
    daysInWeek.forEach((day) => {
      grouped[day] = userData.completedTasks.filter(
        (task) => new Date(task.timestamp).toDateString() === day
      );
    });
    return grouped;
  };

  const dailyGroupedTasks = groupTasksByDay();

  return (
    <div style={styles.containerFluid}>
      <style>{stylesString}</style>
      <nav style={styles.normalmodenav}>
        <div className="nav-brand">
          <img
            src="/trackerLogo.png"
            alt="Logo"
            className="nav-logo"
            loading="lazy"
          />
          <span className="nav-title">Normal Mode</span>
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
            <div className="row mb-4" style={styles.profileSection}>
              <div className="col-12 col-md-6">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div
                    style={styles.cardBody}
                    className="text-center p-3 d-flex align-items-center justify-content-center"
                  >
                    <div>
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-4">
              <div className="col-12 col-md-6 mb-3">
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
              <div className="col-12 col-md-6">
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
                        {userData.tasks.map((task, index) => (
                          <option key={index} value={index}>
                            {task.name} {task.boost ? `(${task.boost})` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedBoost}
                        onChange={(e) => setSelectedBoost(e.target.value)}
                        className="me-2 mb-2"
                      >
                        <option value="">Select a Boost</option>
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
                      <button onClick={applyBoost} className="mb-2">
                        Apply Boost
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-4 justify-content-center" id="start-buttons">
              <button
                onClick={startTheWeek}
                style={styles.startWeekButton}
                className="btn"
              >
                Start the Week
              </button>
              <button
                onClick={startTheDay}
                style={styles.startDayButton}
                className="btn"
              >
                Start the Day
              </button>
              <button
                onClick={refreshGlobalTasksFromLogic}
                style={{
                  margin: "10px",
                  padding: "10px 20px",
                  backgroundColor: "#ffc107",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                }}
                className="btn"
              >
                Refresh Global Tasks
              </button>
            </div>
            <div className="row">
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
                  id="daily-tasks"
                >
                  <div style={styles.cardBody}>
                    <h6 style={styles.cardTitle}>Daily Tasks</h6>
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
                                      const taskId = Object.keys(
                                        GLOBAL_TASKS
                                      ).find(
                                        (key) =>
                                          GLOBAL_TASKS[key].name === task.name
                                      );
                                      const isCompleteDisabled =
                                        task.dailyCounter >= task.dailyLimit;
                                      return (
                                        <li
                                          key={taskIndex}
                                          style={styles.listGroupItem}
                                          className="d-flex justify-content-between align-items-center py-1 position-relative"
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
                                                className="ms-2"
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
                                                className="ms-2"
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
                                              {task.lifetimeCompletionCount} |
                                              Daily: {task.dailyCounter}/
                                              {task.dailyLimit}
                                            </small>
                                          </div>
                                          <div className="d-flex align-items-center">
                                            <button
                                              onClick={() =>
                                                completeTask(originalIndex)
                                              }
                                              className="btn btn-success btn-sm me-1"
                                              disabled={isCompleteDisabled}
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
                                                className="btn btn-danger btn-sm"
                                              >
                                                Remove Boost
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
                  className="card shadow-sm h-100"
                >
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
                            )
                          )}
                      </ul>
                    ) : (
                      <p className="text-muted text-center small">
                        No completed tasks today.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
                >
                  <div style={styles.cardBody}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 style={styles.cardTitle}>
                        This Week's Completed Tasks
                      </h6>
                      <button
                        onClick={() => setIsWeeklyTasksOpen(!isWeeklyTasksOpen)}
                        className="btn btn-sm btn-outline-primary"
                      >
                        {isWeeklyTasksOpen ? "Hide" : "Show"}
                      </button>
                    </div>
                    {isWeeklyTasksOpen && (
                      <div className="accordion">
                        {Object.entries(dailyGroupedTasks).map(
                          ([day, tasks]) => (
                            <div className="accordion-item" key={day}>
                              <h2 className="accordion-header">
                                <button
                                  className="accordion-button text-dark"
                                  onClick={() => toggleSection(day)}
                                  aria-expanded={openSections[day]}
                                >
                                  {day} ({tasks.length} tasks)
                                </button>
                              </h2>
                              <div
                                className={`accordion-collapse collapse ${
                                  openSections[day] ? "show" : ""
                                }`}
                              >
                                <div className="accordion-body p-2">
                                  {tasks.length > 0 ? (
                                    <ul className="list-group list-group-flush">
                                      {tasks.map((task, index) =>
                                        task.isPenalty ? (
                                          <li
                                            key={index}
                                            style={styles.penaltyListGroupItem}
                                            className="d-flex justify-content-between align-items-center py-1"
                                          >
                                            <span>
                                              {task.name}{" "}
                                              <span className="fw-bold">
                                                Penalized
                                              </span>
                                            </span>
                                            <button
                                              onClick={() =>
                                                undoTask(
                                                  userData.completedTasks.findIndex(
                                                    (t) =>
                                                      t.name === task.name &&
                                                      t.timestamp ===
                                                        task.timestamp
                                                  )
                                                )
                                              }
                                              className="btn btn-danger btn-sm"
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
                                              <small className="text-muted ms-2">
                                                (Points: {task.points})
                                              </small>
                                            </span>
                                            <button
                                              onClick={() =>
                                                undoTask(
                                                  userData.completedTasks.findIndex(
                                                    (t) =>
                                                      t.name === task.name &&
                                                      t.timestamp ===
                                                        task.timestamp
                                                  )
                                                )
                                              }
                                              className="btn btn-danger btn-sm"
                                            >
                                              Undo
                                            </button>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  ) : (
                                    <p className="text-muted small">
                                      No tasks completed on this day.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
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

export default NormalMode;
