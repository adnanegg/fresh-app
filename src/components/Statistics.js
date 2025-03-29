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
  const [historicalCompletions, setHistoricalCompletions] = useState({});
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [overallPerf, setOverallPerf] = useState(0);

  // Fetch global tasks only once and cache
  const fetchGlobalTasks = useCallback(async () => {
    const globalTasksRef = ref(database, "globalTasks");
    const snapshot = await get(globalTasksRef);
    setGlobalTasks(snapshot.val() || {});
  }, []);

  // Fetch user data efficiently with minimal reads
  const fetchUserData = useCallback(
    async (userId, isInitial = false) => {
      if (isInitial) setIsLoading(true);
      try {
        // Fetch global tasks only if not already fetched
        if (Object.keys(globalTasks).length === 0) {
          await fetchGlobalTasks();
        }

        const [tasksSnap, completedSnap, historicalSnap, weekSnap] =
          await Promise.all([
            get(ref(database, `users/${userId}/tasks`)),
            get(ref(database, `users/${userId}/completedTasks`)),
            get(ref(database, `users/${userId}/historicalCompletions`)),
            get(ref(database, `users/${userId}/currentWeek`)),
          ]);

        const userTasks = tasksSnap.val() || {};
        const mergedTasks = Object.keys(globalTasks).map((taskId) => {
          const globalTask = globalTasks[taskId];
          const userTask = userTasks[taskId] || {};
          return {
            ...globalTask,
            taskId,
            completionCount: userTask.completionCount || 0,
            numberLimit: globalTask.numberLimit || Infinity,
            category: globalTask.category || "Task",
          };
        });
        const filteredTasks = mergedTasks.filter(
          (task) => task.category === "Task"
        );
        setTasks(filteredTasks);
        setCompletedTasks(completedSnap.val() || []);
        setHistoricalCompletions(historicalSnap.val() || {});
        setCurrentWeek(weekSnap.val() || 1);

        // Calculate overall performance
        const totalCompletion = filteredTasks.reduce((sum, task) => {
          let historicalSum = 0;
          for (let week = 1; week < (weekSnap.val() || 1); week++) {
            historicalSum += historicalSnap.val()?.[week]?.[task.taskId] || 0;
          }
          return sum + historicalSum + (task.completionCount || 0);
        }, 0);
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

  // Single useEffect for auth state and initial fetch
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) navigate("/login");
      else fetchUserData(user.uid, true);
    });
    return () => unsubscribeAuth();
  }, [navigate, fetchUserData]);

  // Weekly performance (current week only)
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

  const styles = {
    container: { padding: "20px", marginTop: "60px" },
    card: { borderRadius: "8px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" },
    cardBody: { padding: "15px" },
    title: { fontSize: "18px", fontWeight: "bold", marginBottom: "15px" },
    statItem: { marginBottom: "10px" },
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
          <h2 style={styles.title}>Task Statistics</h2>
          <div className="row">
            <div className="col-12 col-md-6 mb-3">
              <div style={styles.card} className="card">
                <div style={styles.cardBody}>
                  <h3 style={styles.title}>Overall Performance</h3>
                  <p style={styles.statItem}>All-Time: {overallPerf}%</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 mb-3">
              <div style={styles.card} className="card">
                <div style={styles.cardBody}>
                  <h3 style={styles.title}>Weekly Performance</h3>
                  <p style={styles.statItem}>
                    This Week: {weeklyPerformance()}%
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <div style={styles.card} className="card">
                <div style={styles.cardBody}>
                  <h3 style={styles.title}>Task-Specific Performance</h3>
                  {tasks.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {tasks.map((task, index) => {
                        const weeklyTask = completedTasks.find(
                          (t) => t.name === task.name
                        );
                        // Calculate task-specific overall performance
                        let historicalSum = 0;
                        for (let week = 1; week < currentWeek; week++) {
                          historicalSum +=
                            historicalCompletions[week]?.[task.taskId] || 0;
                        }
                        const totalTaskCompletion =
                          historicalSum + (task.completionCount || 0);
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
                            className="list-group-item d-flex justify-content-between"
                          >
                            <span>{task.name}</span>
                            <span>
                              Overall: {taskOverallPerf}% | Week: {weeklyPerf}%
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>No tasks available in the 'Tasks' category.</p>
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
