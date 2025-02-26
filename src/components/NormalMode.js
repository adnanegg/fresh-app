import React, { useState, useEffect, useMemo, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import Swal from "sweetalert2";
// import "./styles/Dashboard.css"; // Reuse Dashboard styling
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Configurable bonus values (points only)
const BONUS_POINTS = 10;
 // Group tasks by category (define outside useCallback to avoid circular reference)
 
const NormalMode = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "profile-images/default-profile.png",
  });
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [pointsData, setPointsData] = useState({ current: 0, total: 900 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 3000 });
  const [notifications, setNotifications] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [isLoading, setIsLoading] = useState(true); // Add loading state

 // Group tasks by category (define outside useCallback to avoid circular reference)
 const groupTasksByCategory = (tasks) => {
  return tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {});
};

  // Check if the user is authenticated and fetch data with debouncing
  useEffect(() => {
    let unsubscribe;

    const fetchUserData = async (userId) => {
      setIsLoading(true); // Start loading
      const userRef = ref(database, `users/${userId}`);
      unsubscribe = onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserProfile(data.profile || { name: "User", photo: "/profile-photos/default-profile.png" });
          setTasks(data.tasks || []);
          setCompletedTasks(data.completedTasks || []);
          setPointsData(data.points || { current: 0, total: 900 });
          setMpointsData(data.Mpoints || { current: 0, total: 3000 });
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

  // Memoize grouped tasks to prevent unnecessary re-computation
  const groupedTasks = useMemo(() => groupTasksByCategory(tasks), [tasks]);
 // Group tasks by category (define outside useCallback to avoid circular reference)

  // Group tasks by category (memoized for performance)
 

  // Initialize accordion sections
  useEffect(() => {
    const initialSections = Object.keys(groupedTasks).reduce((acc, category) => ({
      ...acc,
      [category]: category === "Task"
    }), {});
    setOpenSections(initialSections);
  }, [groupedTasks]);

  const toggleSection = useCallback((category) => {
    setOpenSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleModeChange = useCallback(async (index, newMode) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], selectedMode: newMode };
    setTasks(updatedTasks);

    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}/tasks/${index}`);
      await update(userRef, { selectedMode: newMode });
    }
  }, [tasks]);

  const completeTask = useCallback(async (index) => {
    const task = tasks[index];

    if (typeof task.completionCount !== "number" || isNaN(task.completionCount)) {
      task.completionCount = 0;
    }

    if (task.completionCount >= task.numberLimit) {
      Swal.fire({
        icon: "warning",
        title: "Task Limit Reached",
        text: `You have completed "${task.name}" the maximum number of times.`,
        confirmButtonText: "OK",
      });
      return;
    }

    const updatedTask = { ...task, completionCount: task.completionCount + 1 };
    const newTasks = [...tasks];
    newTasks[index] = updatedTask;

    const existingCompletedTaskIndex = completedTasks.findIndex((t) => t.name === task.name);
    let newCompletedTasks = [...completedTasks];

    if (existingCompletedTaskIndex === -1) {
      newCompletedTasks.push({ ...task, completionCount: 1 });
    } else {
      const existingTask = newCompletedTasks[existingCompletedTaskIndex];
      newCompletedTasks[existingCompletedTaskIndex] = {
        ...existingTask,
        completionCount: existingTask.completionCount + 1,
      };
    }

    let effectivePoints = task.selectedMode === 'exceptional' ? task.points / 2 : task.points;
    let bonusPoints = 0;

    if (updatedTask.completionCount === updatedTask.numberLimit) {
      bonusPoints = BONUS_POINTS;
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          taskName: task.name,
          points: bonusPoints,
          position: `task-${index}`,
        },
      ]);
    }

    const newPointsData = { ...pointsData, current: pointsData.current + effectivePoints + bonusPoints };
    const newMpointsData = { ...MpointsData, current: MpointsData.current + effectivePoints + bonusPoints };

    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];

      const taskHistoryRef = ref(database, `users/${userId}/taskHistory/${dateStr}`);
      onValue(taskHistoryRef, (snapshot) => {
        const history = snapshot.val() || {};
        let updatedHistory = { ...history };

        if (task.frequencyUnit === "days") {
          updatedHistory[task.name] = { completed: true };
        } else if (task.frequencyUnit === "times") {
          updatedHistory[task.name] = {
            completions: (history[task.name]?.completions || 0) + 1
          };
        }

        update(taskHistoryRef, updatedHistory);
      }, { onlyOnce: true });

      await update(userRef, {
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        points: newPointsData,
        Mpoints: newMpointsData,
      });
    }

    setPointsData(newPointsData);
    setMpointsData(newMpointsData);
    setTasks(newTasks);
    setCompletedTasks(newCompletedTasks);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== Date.now() - 3000));
    }, 3000);
  }, [tasks, completedTasks, pointsData, MpointsData]);

  const undoTask = useCallback(async (index) => {
    const task = completedTasks[index];
    const taskIndex = tasks.findIndex((t) => t.name === task.name);
    if (taskIndex !== -1) {
      const currentTask = tasks[taskIndex];
      const updatedCompletionCount = Math.max(currentTask.completionCount - task.completionCount, 0);
      const updatedTask = { ...currentTask, completionCount: updatedCompletionCount };
      const newTasks = [...tasks];
      newTasks[taskIndex] = updatedTask;
      const newCompletedTasks = completedTasks.filter((_, i) => i !== index);
      const effectivePoints = task.selectedMode === 'exceptional' ? task.points / 2 : task.points;
      const newPoints = Math.max(pointsData.current - (effectivePoints * task.completionCount), 0);
      const newMpoints = Math.max(MpointsData.current - (effectivePoints * task.completionCount), 0);
      const newPointsData = { ...pointsData, current: newPoints };
      const newMpointsData = { ...MpointsData, current: newMpoints };

      const userId = auth.currentUser?.uid;
      if (userId) {
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, {
          tasks: newTasks,
          completedTasks: newCompletedTasks,
          points: newPointsData,
          Mpoints: newMpointsData,
        });
      }

      setPointsData(newPointsData);
      setMpointsData(newMpointsData);
      setTasks(newTasks);
      setCompletedTasks(newCompletedTasks);
    }
  }, [tasks, completedTasks, pointsData, MpointsData]);

  const resetTaskCompletionCount = useCallback(async (index) => {
    const task = tasks[index];
    const updatedTask = { ...task, completionCount: 0 };
    const newTasks = [...tasks];
    newTasks[index] = updatedTask;

    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        tasks: newTasks,
      });
    }

    setTasks(newTasks);

    Swal.fire({
      icon: "success",
      title: "Task Reset",
      text: `"${task.name}" has been reset. You can now complete it again.`,
      confirmButtonText: "OK",
    });
  }, [tasks]);

  const resetCompletedTasks = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const updatedTasks = tasks.map((task) => ({
      ...task,
      completionCount: 0,
    }));

    const newCompletedTasks = [];

    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        tasks: updatedTasks,
        completedTasks: newCompletedTasks,
      });
    }

    setPointsData({ current: 0, total: 900 });
    setMpointsData({ current: 0, total: 3000 });
    setTasks(updatedTasks);
    setCompletedTasks(newCompletedTasks);

    Swal.fire({
      icon: "success",
      title: "Tasks Reset!",
      text: "All completed tasks have been reset.",
      confirmButtonText: "OK",
    });
  }, [tasks]);

  const resetPointsBar = useCallback(() => {
    const newPointsData = { current: 0, total: 900 };
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      update(userRef, {
        points: newPointsData,
      });
    }

    setPointsData(newPointsData);

    Swal.fire({
      icon: "success",
      title: "Points Bar Reset!",
      text: "The points bar has been reset to 0.",
      confirmButtonText: "OK",
    });
  }, []);

  const resetMonthlyPointsBar = useCallback(() => {
    const newMpointsData = { current: 0, total: 3000 };
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      update(userRef, {
        Mpoints: newMpointsData,
      });
    }

    setMpointsData(newMpointsData);

    Swal.fire({
      icon: "success",
      title: "Monthly Points Bar Reset!",
      text: "The Monthly points bar has been reset to 0.",
      confirmButtonText: "OK",
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigate("/signup");
  }, [navigate]);

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
    dashboardContent: {
      marginTop: "60px", // Space for the top bar
      transition: "none", // Remove transition since no expansion/contraction
      flex: 1,
    },
    dashboardCard: {
      borderRadius: "8px",
      border: "1px solid #e9ecef",
      background: "none",
    },
    cardBody: {
      padding: "12px",
    },
    cardTitle: {
      fontSize: "14px",
      fontWeight: 600,
    },
    listGroupItem: {
      backgroundColor: "transparent",
      border: "none",
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
      background: "linear-gradient(135deg, #ff6b6b, #007bff)", // Red to blue gradient
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
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
    profileAvatar: {
      position: "relative",
      display: "inline-block",
      paddingLeft: "10px",
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
    sidebarProfileIcon: { width: "40px", height: "40px", border: "2px solid #007bff" },

  };

  // Animations for creativity
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
              src={userProfile.photo || "/profile-images/default-profile.png"}
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
            {/* Profile Section */}
            <div className="row mb-4">
              <div className="col-12">
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
            </div>

            {/* Points Progress Bars */}
            <div className="row mb-4">
              <div className="col-12 col-md-6 mb-3 mb-md-0">
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
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
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
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Sections */}
            <div className="row">
              <div className="col-12 col-md-6 mb-3 mb-md-0">
                <div style={styles.dashboardCard} className="card shadow-sm h-100">
                  <div style={styles.cardBody} className="p-3">
                    <h6 style={styles.cardTitle} className="card-title text-primary mb-2">Available Tasks</h6>
                    <div className="accordion" id="tasksAccordion">
                      {Object.entries(groupedTasks).map(([category, categoryTasks], index) => (
                        <div className="accordion-item" key={category}>
                          <h2 className="accordion-header" id={`heading-${category}`}>
                            <button
                              className={`accordion-button ${!openSections[category] ? 'collapsed' : ''} text-dark`}
                              type="button"
                              onClick={() => toggleSection(category)}
                              aria-expanded={openSections[category]}
                              aria-controls={`collapse-${category}`}
                            >
                              {category} ({categoryTasks.length} tasks)
                            </button>
                          </h2>
                          <div
                            id={`collapse-${category}`}
                            className={`accordion-collapse collapse ${openSections[category] ? 'show' : ''}`}
                            aria-labelledby={`heading-${category}`}
                          >
                            <div className="accordion-body p-2">
                              {categoryTasks.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                  {categoryTasks.map((task, taskIndex) => {
                                    const originalIndex = tasks.findIndex(t => t.name === task.name);
                                    return (
                                      <li
                                        key={taskIndex}
                                        style={styles.listGroupItem}
                                        className="d-flex justify-content-between align-items-center py-1 position-relative"
                                        id={`task-${originalIndex}`}
                                      >
                                        <div>
                                          <span style={{ color: "#dc3545" }}>{task.name}</span>
                                          {task.hasExceptionalOption && (
                                            <select
                                              value={task.selectedMode || 'normal'}
                                              onChange={(e) => handleModeChange(originalIndex, e.target.value)}
                                              style={styles.formSelectSm}
                                              className="ms-2"
                                            >
                                              <option value="normal">Normal</option>
                                              <option value="exceptional">Exceptional</option>
                                            </select>
                                          )}
                                          <br />
                                          <small className="text-muted">
                                            ({task.points} Points) | Completed: {task.completionCount}/{task.numberLimit}
                                          </small>
                                        </div>
                                        <div className="d-flex align-items-center">
                                          <button
                                            onClick={() => completeTask(originalIndex)}
                                            className="btn btn-success btn-sm me-1"
                                            disabled={task.completionCount >= task.numberLimit}
                                          >
                                            Complete
                                          </button>
                                          <button
                                            onClick={() => resetTaskCompletionCount(originalIndex)}
                                            className="btn btn-warning btn-sm"
                                          >
                                            Reset
                                          </button>
                                        </div>
                                        {notifications
                                          .filter((n) => n.position === `task-${originalIndex}`)
                                          .map((notification) => (
                                            <div
                                              key={notification.id}
                                              style={styles.taskNotification}
                                              className="task-notification"
                                            >
                                              {notification.points ? `+${notification.points}pts` : ""}
                                            </div>
                                          ))}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-muted small">No tasks in this category</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div style={styles.dashboardCard} className="card shadow-sm h-100">
                  <div style={styles.cardBody} className="p-3">
                    <h6 style={styles.cardTitle} className="card-title text-primary mb-2">Today's Completed Tasks</h6>
                    <ul className="list-group list-group-flush">
                      {completedTasks.map((task, index) => (
                        <li
                          key={index}
                          style={styles.listGroupItem}
                          className="d-flex justify-content-between align-items-center py-1"
                        >
                          <span>
                            <span className="fw-bold text-dark">{task.completionCount}x</span> {task.name}
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
                    {completedTasks.length === 0 && (
                      <p className="text-muted text-center small">No completed tasks today.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Buttons */}
            <div className="row mt-4">
              <div className="col-12 col-md-6 mb-3 mb-md-0">
                <button
                  onClick={resetPointsBar}
                  className="btn btn-warning w-100"
                >
                  Reset Points
                </button>
              </div>
              <div className="col-12 col-md-6">
                <button
                  onClick={resetMonthlyPointsBar}
                  className="btn btn-warning w-100"
                >
                  Reset Monthly Points
                </button>
              </div>
              <div className="col-12 mt-3">
                <button
                  onClick={resetCompletedTasks}
                  className="btn btn-danger w-100"
                >
                  Reset All Completed Tasks
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NormalMode;