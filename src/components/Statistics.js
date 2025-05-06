import React, { useState, useEffect, useCallback, useRef } from "react";
import { auth, database } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import Swal from "sweetalert2";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import Annotation from "chartjs-plugin-annotation";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Register plugins
Chart.register(ChartDataLabels, Annotation);

const Statistics = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [globalTasks, setGlobalTasks] = useState({});
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [overallPerf, setOverallPerf] = useState(0);
  const [creationDate, setCreationDate] = useState("");
  const [weeklyPerformanceData, setWeeklyPerformanceData] = useState({});
  const overallChartRef = useRef(null);
  const taskChartRefs = useRef([]);

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

        const [
          tasksSnap,
          completedSnap,
          weekSnap,
          metadataSnap,
          weeklyPerfSnap,
        ] = await Promise.all([
          get(ref(database, `users/${userId}/tasks`)),
          get(ref(database, `users/${userId}/completedTasks`)),
          get(ref(database, `users/${userId}/currentWeek`)),
          get(ref(database, `users/${userId}/metadata`)),
          get(ref(database, `users/${userId}/weeklyPerformance`)),
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

        const weekNumber = weekSnap.val() || 1;
        setCurrentWeek(weekNumber);

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

        const totalCompletion = filteredTasks.reduce(
          (sum, task) => sum + (task.lifetimeCompletionCount || 0),
          0
        );
        const totalPossible = filteredTasks.reduce(
          (sum, task) => sum + (task.numberLimit || 0) * weekNumber,
          0
        );
        setOverallPerf(
          totalPossible > 0
            ? Math.round((totalCompletion / totalPossible) * 100)
            : 0
        );

        setWeeklyPerformanceData(weeklyPerfSnap.val() || {});

        console.log({
          weekNumber,
          totalCompletion,
          totalPossible,
          filteredTasks: filteredTasks.map((t) => ({
            name: t.name,
            lifetimeCompletionCount: t.lifetimeCompletionCount,
            numberLimit: t.numberLimit,
            totalPossible: t.numberLimit * weekNumber,
          })),
          weeklyPerformanceData: weeklyPerfSnap.val(),
        });
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

  // Diverse color palette for tasks
  const taskColors = [
    "#1E90FF", // Dodger Blue
    "#32CD32", // Lime Green
    "#FF4500", // Orange Red
    "#b09900", // Gold
    "#9932CC", // Dark Orchid
    "#00CED1", // Dark Turquoise
    "#FF69B4", // Hot Pink
    "#883b2d", // Saddle Brown
  ];

  // Calculate previous week comparison for tasks
  const getWeekComparison = (task) => {
    if (currentWeek <= 2) return null;
    const lastWeekKey = (currentWeek - 1).toString();
    const prevWeekKey = (currentWeek - 2).toString();
    const lastPerf =
      weeklyPerformanceData[lastWeekKey]?.[task.taskId]?.performance || 0;
    const prevPerf =
      weeklyPerformanceData[prevWeekKey]?.[task.taskId]?.performance || 0;
    const diff = lastPerf - prevPerf;
    if (diff === 0 || isNaN(diff)) return null;
    const absDiff = Math.abs(diff);
    return {
      isImprovement: diff > 0,
      percentage: absDiff.toFixed(1),
    };
  };

  // Calculate previous week comparison for overall performance
  const getOverallWeekComparison = () => {
    if (currentWeek <= 2) return null;
    const lastWeekKey = (currentWeek - 1).toString();
    const prevWeekKey = (currentWeek - 2).toString();
    const lastPerf = weeklyPerformanceData[lastWeekKey]?.overall || 0;
    const prevPerf = weeklyPerformanceData[prevWeekKey]?.overall || 0;
    const diff = lastPerf - prevPerf;
    if (diff === 0 || isNaN(diff)) return null;
    const absDiff = Math.abs(diff);
    return {
      isImprovement: diff > 0,
      percentage: absDiff.toFixed(1),
    };
  };

  useEffect(() => {
    if (isLoading || Object.keys(weeklyPerformanceData).length === 0) return;

    // Destroy existing charts
    if (overallChartRef.current) {
      overallChartRef.current.destroy();
      overallChartRef.current = null;
    }
    taskChartRefs.current.forEach((chart) => {
      if (chart) chart.destroy();
    });
    taskChartRefs.current = [];

    // Overall Performance Chart
    const overallCanvas = document.getElementById("overallPerformanceChart");
    if (overallCanvas) {
      const overallCtx = overallCanvas.getContext("2d");
      overallChartRef.current = new Chart(overallCtx, {
        type: "line",
        data: {
          labels: Object.keys(weeklyPerformanceData).map(
            (week) => `Week ${week}`
          ),
          datasets: [
            {
              label: "Overall Weekly Performance (%)",
              data: Object.values(weeklyPerformanceData).map(
                (data) => data.overall || 0
              ),
              borderColor: "#1E90FF",
              fill: false,
              tension: 0,
              pointRadius: 6,
              pointHoverRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 120,
              title: {
                display: true,
                text: "Performance (%)",
                font: { size: 14 },
              },
              ticks: { font: { size: 14 }, stepSize: 5 },
            },
            x: {
              title: { display: true, text: "Week", font: { size: 14 } },
              ticks: { font: { size: 14 } },
              offset: true,
            },
          },
          layout: {
            padding: 20,
          },
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                label: (context) => `${context.dataset.label}: ${context.raw}%`,
              },
            },
            datalabels: {
              display: true,
              formatter: (value) => `${value}%`,
              color: "#000",
              font: { size: 14 },
              anchor: "end",
              align: "top",
            },
            annotation: {
              annotations: {
                line1: {
                  type: "line",
                  yMin: 100,
                  yMax: 100,
                  borderColor: "#808080",
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    content: "100% Cap",
                    enabled: true,
                    position: "start",
                    backgroundColor: "rgba(128, 128, 128, 0.7)",
                    font: { size: 12 },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      console.error("Overall performance chart canvas not found");
    }

    // Task Performance Charts (2 tasks per chart, max 4 charts)
    const maxTasks = 8;
    const tasksPerChart = 2;
    const taskGroups = [];
    for (let i = 0; i < Math.min(tasks.length, maxTasks); i += tasksPerChart) {
      taskGroups.push(tasks.slice(i, i + tasksPerChart));
    }

    taskGroups.forEach((group, groupIndex) => {
      const canvas = document.getElementById(
        `taskPerformanceChart${groupIndex}`
      );
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: Object.keys(weeklyPerformanceData).map(
              (week) => `Week ${week}`
            ),
            datasets: group.map((task, index) => ({
              label: task.name,
              data: Object.values(weeklyPerformanceData).map(
                (data) => data[task.taskId]?.performance || 0
              ),
              borderColor:
                taskColors[
                  (groupIndex * tasksPerChart + index) % taskColors.length
                ],
              fill: false,
              tension: 0,
              pointRadius: 6,
              pointHoverRadius: 8,
            })),
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 120,
                title: {
                  display: true,
                  text: "Performance (%)",
                  font: { size: 14 },
                },
                ticks: { font: { size: 14 }, stepSize: 5 },
              },
              x: {
                title: { display: true, text: "Week", font: { size: 14 } },
                ticks: { font: { size: 14 } },
                offset: true,
              },
            },
            layout: {
              padding: 20,
            },
            plugins: {
              legend: { display: true },
              tooltip: {
                callbacks: {
                  label: (context) =>
                    `${context.dataset.label}: ${context.raw}%`,
                },
              },
              datalabels: {
                display: (context) => {
                  // First task: show name at first point; second task: show name at last point
                  if (context.datasetIndex === 0) {
                    return context.dataIndex === 0;
                  }
                  if (context.datasetIndex === 1) {
                    return (
                      context.dataIndex === context.dataset.data.length - 1
                    );
                  }
                  return false;
                },
                formatter: (value, context) => context.dataset.label,
                color: (context) => context.dataset.borderColor,
                font: { size: 14, weight: "bold" },
                anchor: (context) =>
                  context.datasetIndex === 0 ? "start" : "end",
                align: (context) =>
                  context.datasetIndex === 0 ? "start" : "end",
                offset: 10,
              },
              annotation: {
                annotations: {
                  line1: {
                    type: "line",
                    yMin: 100,
                    yMax: 100,
                    borderColor: "#808080",
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: {
                      content: "100% Cap",
                      enabled: true,
                      position: "start",
                      backgroundColor: "rgba(128, 128, 128, 0.7)",
                      font: { size: 12 },
                    },
                  },
                },
              },
            },
          },
        });
        taskChartRefs.current[groupIndex] = chart;
      } else {
        console.error(`Task performance chart ${groupIndex} canvas not found`);
      }
    });

    return () => {
      if (overallChartRef.current) {
        overallChartRef.current.destroy();
        overallChartRef.current = null;
      }
      taskChartRefs.current.forEach((chart) => {
        if (chart) chart.destroy();
      });
      taskChartRefs.current = [];
    };
  }, [weeklyPerformanceData, tasks, isLoading]);

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

  // Generate task chart sections dynamically
  const maxTasks = 8;
  const tasksPerChart = 2;
  const taskGroups = [];
  for (let i = 0; i < Math.min(tasks.length, maxTasks); i += tasksPerChart) {
    taskGroups.push(tasks.slice(i, i + tasksPerChart));
  }

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
                    {getOverallWeekComparison() && (
                      <span
                        style={{
                          color: getOverallWeekComparison().isImprovement
                            ? "green"
                            : "red",
                          marginLeft: "10px",
                          fontSize: "0.9rem",
                        }}
                        title={`Week ${currentWeek - 1} vs. Week ${
                          currentWeek - 2
                        }`}
                      >
                        {getOverallWeekComparison().isImprovement ? "+" : "-"}
                        {getOverallWeekComparison().percentage}%
                      </span>
                    )}
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
                        const weeklyPerf = weeklyTask?.completionCount
                          ? Math.round(
                              (weeklyTask.completionCount / task.numberLimit) *
                                100
                            )
                          : 0;
                        const comparison = getWeekComparison(task);
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
                              <span className="badge bg-info me-2">
                                Week: {weeklyPerf}% (
                                {weeklyTask?.completionCount || 0}/
                                {task.numberLimit})
                              </span>
                              {comparison && (
                                <span
                                  style={{
                                    color: comparison.isImprovement
                                      ? "green"
                                      : "red",
                                    marginLeft: "10px",
                                    fontSize: "0.9rem",
                                  }}
                                  title={`Week ${currentWeek - 1} vs. Week ${
                                    currentWeek - 2
                                  }`}
                                >
                                  {comparison.isImprovement ? "+" : "-"}
                                  {comparison.percentage}%
                                </span>
                              )}
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
          <div className="row mt-4">
            <div className="col-12">
              <div style={styles.card} className="card">
                <div style={styles.cardBody}>
                  <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                    Weekly Performance Trends
                  </h3>
                  {Object.keys(weeklyPerformanceData).length > 0 ? (
                    <>
                      <div className="mb-4">
                        <h4 style={{ fontSize: "1.1rem", color: "#495057" }}>
                          Overall Weekly Performance
                        </h4>
                        <canvas
                          id="overallPerformanceChart"
                          height="100"
                        ></canvas>
                      </div>
                      {taskGroups.map((group, groupIndex) => {
                        const startTask = groupIndex * tasksPerChart + 1;
                        const endTask = Math.min(
                          startTask + tasksPerChart - 1,
                          tasks.length
                        );
                        return (
                          <div key={groupIndex} className="mb-4">
                            <h4
                              style={{ fontSize: "1.1rem", color: "#495057" }}
                            >
                              Task Weekly Performance (Tasks {startTask}–
                              {endTask})
                            </h4>
                            <canvas
                              id={`taskPerformanceChart${groupIndex}`}
                              height="100"
                            ></canvas>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-muted">
                      No weekly performance data available.
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
