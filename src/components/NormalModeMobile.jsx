import React, { useState } from "react";
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

  const [openAchievementSections, setOpenAchievementSections] = useState({});
  const [isWeeklyTasksOpen, setIsWeeklyTasksOpen] = useState(false); // New state for toggling weekly tasks

  const styles = {
    containerFluid: { padding: 0, minHeight: "100vh" },
    dashboardContent: {
      marginTop: "60px",
      padding: "10px",
      flex: 1,
      zIndex: 10,
    },
    dashboardCard: {
      borderRadius: "8px",
      background: "none",
      boxShadow: "none",
    },
    cardBody: { padding: "10px" },
    cardTitle: { fontSize: "12px", fontWeight: 600 },
    listGroupItem: {
      backgroundColor: "transparent",
      border: "none",
      fontSize: "14px",
    },
    penaltyListGroupItem: {
      backgroundColor: "rgba(139, 0, 0, 0.1)",
      border: "1px solid #8b0000",
      color: "#ff4040",
      fontWeight: "bold",
      padding: "6px",
      borderRadius: "4px",
      fontSize: "14px",
    },
    formSelectSm: {
      fontSize: "10px",
      padding: "2px 4px",
      borderRadius: "4px",
      width: "100px",
    },
    taskNotification: {
      position: "absolute",
      top: "-15px",
      right: "0",
      fontSize: "10px",
      color: "#28a745",
      fontWeight: "bold",
      animation: "popUp 3s ease-out forwards",
    },
    pointsProgress: {
      textAlign: "center",
      padding: "10px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #007bff)",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    monthlyPointsProgress: {
      textAlign: "center",
      padding: "10px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #ffc107)",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    progressText: { fontSize: "18px", fontWeight: "bold", color: "white" },
    progressIcon: {
      fontSize: "20px",
      marginBottom: "5px",
      animation: "pulse 2s infinite ease-in-out",
    },
    timesInput: {
      width: "60px",
      padding: "4px",
      fontSize: "12px",
      borderRadius: "4px",
      marginLeft: "5px",
    },
    startWeekButton: {
      margin: "5px",
      padding: "8px 16px",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
    },
    startDayButton: {
      margin: "5px",
      padding: "8px 16px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "4px",
      fontSize: "12px",
    },
    normalmodenav: {
      position: "fixed",
      top: 0,
      width: "100%",
      background: "#ffc107",
      padding: "0.5rem 1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 1000,
    },
    profileSection: {
      padding: "5px 0",
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
      padding: "15px",
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
      flexDirection: "column",
      width: "100%",
    },
    achievementSection: { margin: "5px 0" },
  };

  const stylesString = `
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
    @media (orientation: portrait) {
      .mobile-column {
        flex-direction: column-reverse;
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

  return (
    <div style={styles.containerFluid}>
      <style>{stylesString}</style>
      <nav style={styles.normalmodenav}>
        <div className="nav-brand">
          <img src="/trackerLogo.png" alt="Logo" style={{ width: "30px" }} />
          <span className="nav-title" style={{ fontSize: "14px" }}>
            Program
          </span>
        </div>
        <div className="nav-links" style={{ fontSize: "12px" }}>
          <Link to="/dashboard" className="nav-link">
            <i className="bi bi-house-fill"></i>
          </Link>
          <Link to="/normal-mode" className="nav-link">
            <i className="bi bi-star-fill"></i>
          </Link>
          <Link to="/gamepage" className="nav-link">
            <i className="bi bi-dice-6-fill"></i> Game
          </Link>
          <Link to="/statistics" className="nav-link">
            <i className="bi bi-bar-chart-fill"></i>
          </Link>
          <button onClick={toggleAchievements} className="nav-link">
            <i className="bi bi-trophy-fill"></i>
          </button>
          <button
            onClick={handleLogout}
            className="nav-logout"
            style={{ padding: "2px 5px" }}
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </nav>
      <div style={styles.dashboardContent}>
        {isLoading ? (
          <div className="text-center py-5">
            <div
              className="spinner-border text-primary"
              role="status"
              style={{ width: "2rem", height: "2rem" }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2" style={{ fontSize: "14px" }}>
              Loading tasks...
            </p>
          </div>
        ) : (
          <>
            <div className="row mb-3" style={styles.profileSection}>
              <div className="col-12">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="text-center p-2">
                    <h4
                      style={{ ...styles.cardTitle, fontSize: "16px" }}
                      className="text-dark fw-bold mb-1"
                    >
                      {userData.profile.name}
                    </h4>
                    <p className="text-muted" style={{ fontSize: "10px" }}>
                      User ID: {auth.currentUser?.uid?.slice(0, 8)}...
                    </p>
                    <div className="mt-1">
                      <span className="me-2">
                        <i
                          className="bi bi-star-fill"
                          style={{ color: "#cd7f32", fontSize: "14px" }}
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
                          style={{ color: "#c0c0c0", fontSize: "14px" }}
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
                          style={{ color: "#ffd700", fontSize: "14px" }}
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
            <div className="row mb-3">
              <div className="col-6">
                <div style={styles.dashboardCard} className="card shadow-sm">
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
                      <button
                        onClick={resetPointsBar}
                        className="btn btn-warning btn-sm w-100 mt-1"
                        style={{ fontSize: "10px" }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div style={styles.dashboardCard} className="card shadow-sm">
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
                      <button
                        onClick={resetMonthlyPointsBar}
                        className="btn btn-warning btn-sm w-100 mt-1"
                        style={{ fontSize: "10px" }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-12">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div className="p-2">
                    <h6 style={{ fontSize: "12px", fontWeight: "bold" }}>
                      Apply Boost
                    </h6>
                    <div className="d-flex flex-column">
                      <select
                        value={selectedTaskIndex}
                        onChange={(e) => setSelectedTaskIndex(e.target.value)}
                        className="mb-2"
                        style={{ fontSize: "12px" }}
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
                        className="mb-2"
                        style={{ fontSize: "12px" }}
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
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: "12px" }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row mb-3 justify-content-center">
              <button
                onClick={startTheWeek}
                style={styles.startWeekButton}
                className="btn"
              >
                Start Week
              </button>
              <button
                onClick={startTheDay}
                style={styles.startDayButton}
                className="btn"
              >
                Start Day
              </button>
              <button
                onClick={refreshGlobalTasksFromLogic}
                style={{
                  margin: "5px",
                  padding: "8px 16px",
                  backgroundColor: "#ffc107",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
                className="btn"
              >
                Refresh Tasks
              </button>
            </div>
            <div className="row mobile-column">
              <div className="col-12 mb-3">
                <div style={styles.dashboardCard} className="card shadow-sm">
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
                                style={{ fontSize: "12px" }}
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
                                                style={{ fontSize: "10px" }}
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
                                              style={{ fontSize: "10px" }}
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
                                              style={{ fontSize: "10px" }}
                                            >
                                              Reset
                                            </button>
                                            {task.boost && (
                                              <button
                                                onClick={() =>
                                                  removeBoost(originalIndex)
                                                }
                                                className="btn btn-danger btn-sm mb-1"
                                                style={{ fontSize: "10px" }}
                                              >
                                                Remove
                                              </button>
                                            )}
                                          </div>
                                          <small
                                            className="text-muted"
                                            style={{ fontSize: "10px" }}
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
                                    style={{ fontSize: "12px" }}
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
              <div className="col-12 mb-3">
                <div style={styles.dashboardCard} className="card shadow-sm">
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
                                  style={{ fontSize: "10px" }}
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
                                  style={{ fontSize: "10px" }}
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
                        style={{ fontSize: "12px" }}
                      >
                        No completed tasks today.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-12 mb-3">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 style={styles.cardTitle}>
                        This Week Completed Tasks
                      </h6>
                      <button
                        onClick={() => setIsWeeklyTasksOpen(!isWeeklyTasksOpen)}
                        className="btn btn-sm btn-outline-primary"
                        style={{ fontSize: "10px" }}
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
                                  style={{ fontSize: "10px" }}
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
                                  style={{ fontSize: "10px" }}
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
                          style={{ fontSize: "12px" }}
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
            <h5 style={{ fontSize: "14px" }}>Achievements</h5>
            <button
              onClick={toggleAchievements}
              className="btn btn-danger btn-sm float-end"
              style={{ fontSize: "10px" }}
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
                          color: "#000",
                          fontSize: "12px",
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
                              style={{ fontSize: "12px" }}
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
                                <small style={{ fontSize: "10px" }}>
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
                                style={{ color: starColor, fontSize: "14px" }}
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
