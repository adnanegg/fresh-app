import React, { useState, useEffect, useMemo, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, get, update } from "firebase/database";
import Swal from "sweetalert2";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const BONUS_POINTS = 10;
const BOOSTS = {
  DoubleEverything: {
    multiplier: 2,
    type: "all",
    description: "Doubles Points for this task",
  },
  "+30Percent": {
    percentage: 0.3,
    type: "all",
    description: "Increases Points by 30% for this task",
  },
  TheSavior: {
    type: "savior",
    description: "Enables multiple completions per day",
  },
  DoubleOrDie: {
    multiplier: 2,
    type: "doubleOrDie",
    description: "Doubles points if completed, -10 if missed by reset",
  },
  PerfectBonus: {
    bonus: 50,
    type: "perfectBonus",
    description: "Sets perfect completion bonus to 50 points",
  },
};

const NormalMode = ({ globalTasks }) => {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;
  const [userData, setUserData] = useState(() => {
    const storedData = localStorage.getItem(`userData_${userId}`);
    return storedData
      ? JSON.parse(storedData)
      : {
          profile: { name: "User" },
          points: { current: 0, total: 4500 },
          Mpoints: { current: 0, total: 12000 },
          tasks: [], // Ensure tasks is always an array
          completedTasks: [],
          lastUpdated: Date.now(),
        };
  });
  const [notifications, setNotifications] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState("");
  const [selectedBoost, setSelectedBoost] = useState("");
  const [taskTimes, setTaskTimes] = useState({});

  const groupedTasks = useMemo(() => {
    const tasks = userData.tasks || []; // Fallback to empty array
    return tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {});
  }, [userData.tasks]);

  const syncWithFirebase = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      const firebaseData = snapshot.val() || {};
      const localLastUpdated = userData.lastUpdated || 0;
      const firebaseLastUpdated = firebaseData.lastUpdated || 0;

      if (firebaseLastUpdated > localLastUpdated) {
        localStorage.setItem(
          `userData_${userId}`,
          JSON.stringify(firebaseData)
        );
        setUserData(firebaseData);
      } else {
        await update(userRef, userData);
      }
    } catch (error) {
      console.error("Sync error:", error);
      Swal.fire({
        icon: "error",
        title: "Sync Failed",
        text: "Could not sync with server.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, userData]);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const initialTasks = Object.keys(globalTasks || {}).map((taskId) => ({
      ...globalTasks[taskId],
      taskId,
      completionCount:
        userData.tasks.find((t) => t.taskId === taskId)?.completionCount || 0,
      dailyCounter:
        userData.tasks.find((t) => t.taskId === taskId)?.dailyCounter || 0,
      boost: userData.tasks.find((t) => t.taskId === taskId)?.boost || null,
      hasTimesOption:
        userData.tasks.find((t) => t.taskId === taskId)?.hasTimesOption ||
        globalTasks[taskId].hasTimesOption ||
        false,
      selectedMode:
        userData.tasks.find((t) => t.taskId === taskId)?.selectedMode ||
        "normal",
    }));
    setUserData((prev) => ({ ...prev, tasks: initialTasks }));

    if (Object.keys(openSections).length === 0 && initialTasks.length > 0) {
      setOpenSections(
        Object.keys(groupedTasks).reduce(
          (acc, category) => ({ ...acc, [category]: category === "Task" }),
          {}
        )
      );
    }

    const intervalId = setInterval(syncWithFirebase, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(intervalId);
  }, [navigate, userId, globalTasks, groupedTasks, syncWithFirebase]);

  const updateLocalData = (newData) => {
    const updatedData = { ...userData, ...newData, lastUpdated: Date.now() };
    localStorage.setItem(`userData_${userId}`, JSON.stringify(updatedData));
    setUserData(updatedData);
  };

  const toggleSection = useCallback(
    (category) =>
      setOpenSections((prev) => ({ ...prev, [category]: !prev[category] })),
    []
  );

  const handleModeChange = useCallback(
    (index, newMode) => {
      const updatedTasks = userData.tasks.map((t, i) =>
        i === index ? { ...t, selectedMode: newMode } : t
      );
      updateLocalData({ tasks: updatedTasks });
    },
    [userData.tasks]
  );

  const applyBoost = useCallback(async () => {
    if (selectedTaskIndex === "" || !selectedBoost) {
      Swal.fire({
        icon: "warning",
        title: "Selection Required",
        text: "Please select a task and a boost.",
      });
      return;
    }
    const task = userData.tasks[selectedTaskIndex];
    if (task.boost) {
      Swal.fire({
        icon: "warning",
        title: "Boost Already Applied",
        text: `A boost (${task.boost}) is already applied to "${task.name}".`,
      });
      return;
    }
    const result = await Swal.fire({
      title: `Apply ${selectedBoost}?`,
      text: BOOSTS[selectedBoost].description,
      icon: "question",
      showCancelButton: true,
    });
    if (result.isConfirmed) {
      const updatedTasks = userData.tasks.map((t, i) =>
        i === Number(selectedTaskIndex)
          ? {
              ...t,
              boost: selectedBoost,
              hasTimesOption:
                selectedBoost === "TheSavior" ? true : t.hasTimesOption,
            }
          : t
      );
      updateLocalData({ tasks: updatedTasks });
      Swal.fire({
        icon: "success",
        title: "Boost Applied!",
        text: `Boost ${selectedBoost} applied to ${task.name}.`,
      });
    }
    setSelectedTaskIndex("");
    setSelectedBoost("");
  }, [userData.tasks, selectedTaskIndex, selectedBoost]);

  const removeBoost = useCallback(
    async (index) => {
      const task = userData.tasks[index];
      if (!task.boost) {
        Swal.fire({
          icon: "warning",
          title: "No Boost",
          text: `No boost is applied to "${task.name}".`,
        });
        return;
      }
      const result = await Swal.fire({
        title: "Remove Boost?",
        text: `Remove ${task.boost} from "${task.name}"?`,
        icon: "question",
        showCancelButton: true,
      });
      if (result.isConfirmed) {
        const updatedTasks = userData.tasks.map((t, i) =>
          i === index
            ? {
                ...t,
                boost: null,
                hasTimesOption:
                  task.boost === "TheSavior" ? false : t.hasTimesOption,
              }
            : t
        );
        updateLocalData({ tasks: updatedTasks });
        Swal.fire({
          icon: "success",
          title: "Boost Removed!",
          text: `Boost removed from ${task.name}.`,
        });
      }
    },
    [userData.tasks]
  );

  const handleTimesChange = useCallback((index, value) => {
    setTaskTimes((prev) => ({
      ...prev,
      [index]: value === "" ? "" : Math.max(1, parseInt(value) || 1),
    }));
  }, []);

  const completeTask = useCallback(
    (index) => {
      const task = userData.tasks[index];
      if (!task || typeof task.points !== "number") return;

      const times = task.hasTimesOption ? taskTimes[index] || 1 : 1;
      if (task.dailyCounter + times > task.dailyLimit) {
        Swal.fire({
          icon: "warning",
          title: "Daily Limit Reached",
          text: `Daily limit of ${task.dailyLimit} reached for "${task.name}".`,
        });
        return;
      }
      if (task.completionCount >= task.numberLimit) {
        Swal.fire({
          icon: "warning",
          title: "Task Limit Reached",
          text: `"${task.name}" completed max times (${task.numberLimit}).`,
        });
        return;
      }
      const newCompletionCount = task.completionCount + times;
      if (newCompletionCount > task.numberLimit) {
        Swal.fire({
          icon: "warning",
          title: "Exceeds Limit",
          text: `Completing ${times} times exceeds limit of ${task.numberLimit}.`,
        });
        return;
      }

      let effectivePoints = task.points;
      let bonusPoints = 0;
      if (task.hasExceptionalOption) {
        if (task.selectedMode === "exceptional")
          effectivePoints = task.points / 2;
        else if (task.selectedMode === "penalty")
          effectivePoints = -(task.penaltyPoints || task.penalty || 10);
      }
      if (
        task.boost &&
        (!task.hasExceptionalOption || task.selectedMode !== "penalty")
      ) {
        const boost = BOOSTS[task.boost];
        if (boost.multiplier) effectivePoints *= boost.multiplier;
        else if (boost.percentage) effectivePoints *= 1 + boost.percentage;
      }
      const totalPoints = effectivePoints * times;
      if (
        newCompletionCount === task.numberLimit &&
        (!task.hasExceptionalOption || task.selectedMode !== "penalty")
      ) {
        bonusPoints =
          task.boost === "PerfectBonus"
            ? BOOSTS["PerfectBonus"].bonus
            : BONUS_POINTS;
      }

      const updatedTask = {
        ...task,
        completionCount: newCompletionCount,
        dailyCounter: task.dailyCounter + times,
      };
      const newTasks = userData.tasks.map((t, i) =>
        i === index ? updatedTask : t
      );
      const newCompletedTasks = [...userData.completedTasks];
      const existingIndex = newCompletedTasks.findIndex(
        (t) => t.name === task.name
      );

      if (existingIndex === -1) {
        newCompletedTasks.push({
          name: task.name,
          basePoints: task.points,
          points: totalPoints,
          completionCount: times,
          bonusPoints,
          boost: task.boost || null,
          numberLimit: task.numberLimit,
          hasTimesOption: task.hasTimesOption,
          hasExceptionalOption: task.hasExceptionalOption || false,
          category: task.category || "Task",
          frequencyUnit: task.frequencyUnit || "days",
          weeklyFrequency: task.weeklyFrequency || 1,
          requiredCompletions: task.requiredCompletions || 1,
          dailyLimit: task.dailyLimit,
          dailyCounter: times,
          penaltyPoints: task.penaltyPoints || task.penalty || 0,
          ...(task.hasExceptionalOption
            ? {
                selectedMode: task.selectedMode || "normal",
                isPenalty: task.selectedMode === "penalty",
              }
            : {}),
          ...(task.hasTimesOption ? { times } : {}),
        });
      } else {
        const existingTask = newCompletedTasks[existingIndex];
        newCompletedTasks[existingIndex] = {
          ...existingTask,
          points: existingTask.points + totalPoints,
          completionCount: existingTask.completionCount + times,
          bonusPoints:
            newCompletionCount === task.numberLimit && !existingTask.bonusPoints
              ? bonusPoints
              : existingTask.bonusPoints,
          dailyCounter: existingTask.dailyCounter + times,
        };
      }

      const newPointsData = {
        ...userData.points,
        current: Math.max(
          userData.points.current + totalPoints + bonusPoints,
          0
        ),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(
          userData.Mpoints.current + totalPoints + bonusPoints,
          0
        ),
      };
      updateLocalData({
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        points: newPointsData,
        Mpoints: newMpointsData,
      });

      setTaskTimes((prev) => ({ ...prev, [index]: "" }));
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          position: `task-${index}`,
          points: totalPoints + bonusPoints,
        },
      ]);
      setTimeout(
        () =>
          setNotifications((prev) => prev.filter((n) => n.id !== Date.now())),
        3000
      );
    },
    [userData, taskTimes]
  );

  const undoTask = useCallback(
    (index) => {
      const task = userData.completedTasks[index];
      const taskIndex = userData.tasks.findIndex((t) => t.name === task.name);
      const originalTask = taskIndex !== -1 ? userData.tasks[taskIndex] : null;

      const newCompletionCount = Math.max(task.completionCount - 1, 0);
      const newDailyCounter = Math.max(task.dailyCounter - 1, 0);
      let pointsToAdjust = task.points / task.completionCount;
      if (task.hasExceptionalOption) {
        if (task.selectedMode === "penalty")
          pointsToAdjust = -(task.penaltyPoints || task.penalty || 10);
        else if (task.selectedMode === "exceptional")
          pointsToAdjust = task.basePoints / 2;
      }
      if (task.bonusPoints && task.completionCount === task.numberLimit)
        pointsToAdjust += task.bonusPoints;

      const newCompletedTasks = [...userData.completedTasks];
      if (newCompletionCount > 0) {
        newCompletedTasks[index] = {
          ...task,
          completionCount: newCompletionCount,
          points: task.points - pointsToAdjust,
          dailyCounter: newDailyCounter,
          bonusPoints:
            newCompletionCount === task.numberLimit - 1 ? 0 : task.bonusPoints,
          ...(task.hasTimesOption
            ? { times: Math.max((task.times || task.completionCount) - 1, 0) }
            : {}),
        };
      } else {
        newCompletedTasks.splice(index, 1);
      }

      const newTasks = originalTask
        ? userData.tasks.map((t, i) =>
            i === taskIndex
              ? {
                  ...t,
                  completionCount: Math.max(t.completionCount - 1, 0),
                  dailyCounter: newDailyCounter,
                }
              : t
          )
        : userData.tasks;
      const newPointsData = {
        ...userData.points,
        current: Math.max(userData.points.current - pointsToAdjust, 0),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(userData.Mpoints.current - pointsToAdjust, 0),
      };
      updateLocalData({
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        points: newPointsData,
        Mpoints: newMpointsData,
      });
    },
    [userData]
  );

  const resetTaskCompletionCount = useCallback(
    (index) => {
      const task = userData.tasks[index];
      const updatedTasks = userData.tasks.map((t, i) =>
        i === index ? { ...t, completionCount: 0, dailyCounter: 0 } : t
      );
      updateLocalData({ tasks: updatedTasks });
      Swal.fire({
        icon: "success",
        title: "Task Reset",
        text: `"${task.name}" has been reset.`,
      });
    },
    [userData.tasks]
  );

  const resetCompletedTasks = useCallback(() => {
    const taskMap = new Map();
    userData.completedTasks.forEach((completedTask) =>
      taskMap.set(completedTask.name, { ...completedTask, dailyCounter: 0 })
    );
    const resetTasks = userData.tasks.map((task) =>
      taskMap.get(task.name) ? { ...task, dailyCounter: 0 } : task
    );
    updateLocalData({ tasks: resetTasks, completedTasks: [] });
    Swal.fire({
      icon: "success",
      title: "Tasks Reset!",
      text: "All tasks returned to Daily Tasks.",
    });
  }, [userData]);

  const resetAllTaskCompletionCount = useCallback(() => {
    const resetTasks = userData.tasks.map((task) => ({
      ...task,
      completionCount: 0,
      dailyCounter: 0,
    }));
    updateLocalData({ tasks: resetTasks });
    Swal.fire({
      icon: "success",
      title: "All Tasks Reset!",
      text: "All task completions reset to 0.",
    });
  }, [userData.tasks]);

  const resetPointsBar = useCallback(() => {
    const newPointsData = { current: 0, total: 4500 };
    updateLocalData({ points: newPointsData });
    Swal.fire({
      icon: "success",
      title: "Points Bar Reset!",
      text: "Points reset to 0.",
    });
  }, []);

  const resetMonthlyPointsBar = useCallback(() => {
    const newMpointsData = { current: 0, total: 12000 };
    updateLocalData({ Mpoints: newMpointsData });
    Swal.fire({
      icon: "success",
      title: "Monthly Points Reset!",
      text: "Monthly points reset to 0.",
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await syncWithFirebase();
    await signOut(auth);
    localStorage.removeItem(`userData_${userId}`);
    navigate("/login");
  }, [navigate, syncWithFirebase, userId]);

  const startTheWeek = useCallback(() => {
    const resetTasks = userData.tasks.map((task) => ({
      ...task,
      completionCount: 0,
      dailyCounter: 0,
    }));
    const newPointsData = { current: 0, total: 4500 };
    updateLocalData({
      tasks: resetTasks,
      completedTasks: [],
      points: newPointsData,
    });
    Swal.fire({
      icon: "success",
      title: "Week Started!",
      text: "All tasks, completions, and points reset.",
    });
  }, [userData]);

  const startTheDay = useCallback(() => {
    const taskMap = new Map();
    userData.completedTasks.forEach((completedTask) =>
      taskMap.set(completedTask.name, { ...completedTask, dailyCounter: 0 })
    );
    const resetTasks = userData.tasks.map((task) =>
      taskMap.get(task.name) ? { ...task, dailyCounter: 0 } : task
    );
    updateLocalData({ tasks: resetTasks, completedTasks: [] });
    Swal.fire({
      icon: "success",
      title: "Day Started!",
      text: "Daily tasks reset.",
    });
  }, [userData]);

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
  };

  const stylesString = `
    @keyframes popUp { 0% { opacity: 0; transform: translateY(-10px); } 50% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
  `;

  const getProgressColor = (current, total) => {
    const percentage = (current / total) * 100;
    if (percentage >= 75) return "#28a745";
    if (percentage >= 25) return "#ffc107";
    return "#dc3545";
  };

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
                        User ID: {auth.currentUser?.uid?.slice(0, 8)}...
                      </p>
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
            <div className="row mb-4">
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
                        {Object.entries(BOOSTS).map(([key, boost]) => (
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
            <div className="row mb-4 justify-content-center">
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
            </div>
            <div className="row">
              <div className="col-12 col-md-6 mb-3">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
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
                                      const isCompleteDisabled =
                                        task.dailyCounter >= task.dailyLimit;
                                      return (
                                        <li
                                          key={taskIndex}
                                          style={styles.listGroupItem}
                                          className="d-flex justify-content-between align-items-center py-1 position-relative"
                                          id={`task-${originalIndex}`}
                                        >
                                          <div>
                                            <span style={{ color: "#dc3545" }}>
                                              {task.name}
                                            </span>
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
                                                : ""}{" "}
                                              ) | Total: {task.completionCount}/
                                              {task.numberLimit} | Daily:{" "}
                                              {task.dailyCounter}/
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
              <div className="col-12 col-md-6">
                <div
                  style={styles.dashboardCard}
                  className="card shadow-sm h-100"
                >
                  <div style={styles.cardBody}>
                    <h6 style={styles.cardTitle}>Completed Tasks</h6>
                    <button
                      onClick={() =>
                        setOpenSections((prev) => ({
                          ...prev,
                          completedTasks: !prev.completedTasks,
                        }))
                      }
                      className="btn btn-primary w-100 mb-2"
                    >
                      {openSections.completedTasks
                        ? "Hide Completed Tasks"
                        : "Show Completed Tasks"}
                    </button>
                    {openSections.completedTasks &&
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
    </div>
  );
};

export default NormalMode;
