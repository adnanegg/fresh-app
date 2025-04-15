import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const Statistics = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [globalTasks, setGlobalTasks] = useState({});
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [overallPerf, setOverallPerf] = useState(0);
  const [creationDate, setCreationDate] = useState("");

  const fetchGlobalTasks = useCallback(async () => {
    const cachedGlobalTasks = JSON.parse(localStorage.getItem("globalTasks"));
    if (cachedGlobalTasks) {
      setGlobalTasks(cachedGlobalTasks);
      return;
    }
    const globalTasksRef = ref(database, "globalTasks");
    const snapshot = await get(globalTasksRef);
    const fetchedGlobalTasks = snapshot.val() || {};
    setGlobalTasks(fetchedGlobalTasks);
    localStorage.setItem("globalTasks", JSON.stringify(fetchedGlobalTasks));
  }, []);

  const fetchUserData = useCallback(
    async (userId, isInitial = false) => {
      if (isInitial) setIsLoading(true);
      try {
        if (Object.keys(globalTasks).length === 0) {
          await fetchGlobalTasks();
        }

        const [tasksSnap, completedSnap, weekSnap, metadataSnap] =
          await Promise.all([
            get(ref(database, `users/${userId}/tasks`)),
            get(ref(database, `users/${userId}/completedTasks`)),
            get(ref(database, `users/${userId}/currentWeek`)),
            get(ref(database, `users/${userId}/metadata`)),
          ]);

        const userTasks = tasksSnap.val() || {};
        const mergedTasks = Object.keys(globalTasks).map((taskId) => {
          const globalTask = globalTasks[taskId];
          const userTask = userTasks[taskId] || {};
          return {
            ...globalTask,
            taskId,
            completionCount: userTask.completionCount || 0,
            lifetimeCompletionCount: userTask.lifetimeCompletionCount || 0,
            numberLimit: globalTask.numberLimit || Infinity,
            category: globalTask.category || "Task",
          };
        });
        const filteredTasks = mergedTasks.filter(
          (task) => task.category === "Task"
        );
        setTasks(filteredTasks);
        setCompletedTasks(completedSnap.val() || []);
        setCurrentWeek(weekSnap.val() || 1);

        if (metadataSnap.exists()) {
          const createdAt =
            metadataSnap.val().createdAt ||
            auth.currentUser.metadata.creationTime;
          setCreationDate(new Date(createdAt).toLocaleDateString());
        } else {
          setCreationDate(
            new Date(
              auth.currentUser.metadata.creationTime
            ).toLocaleDateString()
          );
        }

        // Overall Performance
        const totalCompletion = filteredTasks.reduce(
          (sum, task) => sum + (task.lifetimeCompletionCount || 0),
          0
        );
        const totalPossible =
          filteredTasks.reduce(
            (sum, task) => sum + (task.numberLimit || 0),
            0
          ) * (weekSnap.val() || 1);
        setOverallPerf(
          totalPossible > 0
            ? Math.round((totalCompletion / totalPossible) * 100)
            : 0
        );
      } catch (error) {
        console.error("Fetch error:", error);
        Swal.fire({
          icon: "error",
          title: "Fetch Failed",
          text: "Could not load statistics.",
        });
      } finally {
        if (isInitial) setIsLoading(false);
      }
    },
    [fetchGlobalTasks, globalTasks]
  );

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) navigate("/login");
      else fetchUserData(user.uid, true);
    });

    const handleStorageChange = (e) => {
      if (e.key === "statsRefreshTimestamp" && auth.currentUser) {
        fetchUserData(auth.currentUser.uid, false);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      unsubscribeAuth();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [navigate, fetchUserData]);

  const weeklyPerformance = useCallback(() => {
    if (completedTasks.length === 0) return 0;
    const totalWeeklyCompletion = completedTasks.reduce(
      (sum, task) => sum + (task.completionCount || 0),
      0
    );
    const totalPossible = tasks.reduce(
      (sum, task) => sum + (task.numberLimit || 0),
      0
    );
    return totalPossible > 0
      ? Math.round((totalWeeklyCompletion / totalPossible) * 100)
      : 0;
  }, [completedTasks, tasks]);

  // Additional Stats
  const taskCompletionRate = tasks.length
    ? Math.round(
        (tasks.filter((t) => (t.lifetimeCompletionCount || 0) > 0).length /
          tasks.length) *
          100
      )
    : 0;

  const topTask = tasks.reduce(
    (top, task) => {
      const totalTaskCompletion = task.lifetimeCompletionCount || 0;
      const totalTaskPossible = task.numberLimit * currentWeek;
      const taskOverallPerf = totalTaskPossible
        ? Math.round((totalTaskCompletion / totalTaskPossible) * 100)
        : 0;
      const topPerf =
        top.numberLimit * currentWeek
          ? Math.round(
              ((top.lifetimeCompletionCount || 0) /
                (top.numberLimit * currentWeek)) *
                100
            )
          : 0;
      return taskOverallPerf > topPerf ? task : top;
    },
    { name: "None", lifetimeCompletionCount: 0, numberLimit: 1 }
  );

  const weeksActive = currentWeek - 1;

  const styles = {
    container: {
      padding: "20px",
      marginTop: "60px",
      maxWidth: "1200px",
      marginLeft: "auto",
      marginRight: "auto",
    },
    card: {
      borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      background: "linear-gradient(135deg, #ffffff, #f8f9fa)",
    },
    cardBody: { padding: "20px" },
    title: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      marginBottom: "20px",
      color: "#343a40",
    },
    statItem: { marginBottom: "15px", fontSize: "1.1rem", color: "#495057" },
    statValue: { fontWeight: "bold", color: "#007bff" },
  };

  return (
    <div style={styles.container}>
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading statistics...</p>
        </div>
      ) : (
        <>
          <h2 style={styles.title} className="text-center mb-4">
            <i className="bi bi-bar-chart-fill me-2"></i>Task Statistics
          </h2>
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div style={styles.card} className="card h-100">
                <div style={styles.cardBody}>
                  <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                    Performance Overview
                  </h3>
                  <p style={styles.statItem}>
                    <i className="bi bi-star-fill text-warning me-2"></i>
                    Overall Performance:{" "}
                    <span style={styles.statValue}>{overallPerf}%</span>
                  </p>
                  <p style={styles.statItem}>
                    <i className="bi bi-calendar-week text-primary me-2"></i>
                    Weekly Performance:{" "}
                    <span style={styles.statValue}>{weeklyPerformance()}%</span>
                  </p>
                  <p style={styles.statItem}>
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Task Completion Rate:{" "}
                    <span style={styles.statValue}>{taskCompletionRate}%</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div style={styles.card} className="card h-100">
                <div style={styles.cardBody}>
                  <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                    Highlights
                  </h3>
                  <p style={styles.statItem}>
                    <i className="bi bi-trophy-fill text-gold me-2"></i>
                    Top Task:{" "}
                    <span style={styles.statValue}>
                      {topTask.name} (
                      {topTask.numberLimit * currentWeek
                        ? Math.round(
                            ((topTask.lifetimeCompletionCount || 0) /
                              (topTask.numberLimit * currentWeek)) *
                              100
                          )
                        : 0}
                      %)
                    </span>
                  </p>
                  <p style={styles.statItem}>
                    <i className="bi bi-clock-history text-info me-2"></i>
                    Weeks Active:{" "}
                    <span style={styles.statValue}>{weeksActive}</span>
                  </p>
                  <p style={styles.statItem}>
                    <i className="bi bi-calendar-date text-muted me-2"></i>
                    Since: <span style={styles.statValue}>{creationDate}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="row mt-4">
            <div className="col-12">
              <div style={styles.card} className="card">
                <div style={styles.cardBody}>
                  <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                    Task-Specific Performance
                  </h3>
                  {tasks.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {tasks.map((task, index) => {
                        const weeklyTask = completedTasks.find(
                          (t) => t.name === task.name
                        );
                        const totalTaskCompletion =
                          task.lifetimeCompletionCount || 0;
                        const totalTaskPossible =
                          task.numberLimit * currentWeek;
                        const taskOverallPerf = totalTaskPossible
                          ? Math.round(
                              (totalTaskCompletion / totalTaskPossible) * 100
                            )
                          : 0;
                        const weeklyPerf = weeklyTask?.numberLimit
                          ? Math.round(
                              (weeklyTask.completionCount / task.numberLimit) *
                                100
                            )
                          : 0;
                        return (
                          <li
                            key={index}
                            className="list-group-item d-flex justify-content-between align-items-center"
                            style={{ padding: "10px 0" }}
                          >
                            <span>{task.name}</span>
                            <span>
                              <span className="badge bg-primary me-2">
                                Overall: {taskOverallPerf}% (
                                {totalTaskCompletion}/{totalTaskPossible})
                              </span>
                              <span className="badge bg-success">
                                Week: {weeklyPerf}%
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-muted">
                      No tasks available in the 'Tasks' category.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
