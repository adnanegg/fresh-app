import React, { useState } from "react";
import { ref, get } from "firebase/database";
import { database, auth } from "../firebase";
import Swal from "sweetalert2";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useNavigate } from "react-router-dom";

// Register Chart.js components and datalabels plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const AdminScorePage = () => {
  const navigate = useNavigate();
  const [scoreData, setScoreData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [taskAverages, setTaskAverages] = useState([]);
  const [nonReadyUsers, setNonReadyUsers] = useState([]); // Stores { userId, lastLogin }
  const isAdmin = auth.currentUser?.email === "admin@gmail.com";

  // Redirect non-admins
  if (!isAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Task key mapping to ensure consistency
  const taskKeyMap = {
    book_read: { key: "BookP", display: "Book" },
    quran_read: { key: "QuoranP", display: "Quran" },
    prayer_mosque: { key: "PrayerP", display: "Prayer" },
    sport_exercise: { key: "SportP", display: "Sport" },
    quran_listen: { key: "QuranListenP", display: "QuranListen" },
    improvement_15min: {
      key: "Improvement15minP",
      display: "Improvement15min",
    },
    wake_up_early: { key: "WakeUpEarlyP", display: "WakeUpEarly" },
  };

  // Define performance goals for specific tasks
  const taskGoals = {
    Book: 70,
    Quran: 80,
    Sport: 70,
    Prayer: 70,
  };

  const fetchAllUserData = async () => {
    try {
      Swal.fire({
        title: "Fetching Data...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const usersSnapshot = await get(ref(database, "users"));
      if (!usersSnapshot.exists()) {
        Swal.fire("No users found");
        return;
      }

      const users = usersSnapshot.val();
      const globalTasksSnap = await get(ref(database, "globalTasks"));
      const globalTasks = globalTasksSnap.val() || {};

      const scoreChartData = [];
      const performanceTableData = [];
      const taskSums = {
        BookP: 0,
        QuoranP: 0,
        PrayerP: 0,
        SportP: 0,
        QuranListenP: 0,
        Improvement15minP: 0,
        WakeUpEarlyP: 0,
      };
      const bestUsersTemp = {
        BookP: { username: "N/A", percentage: 0 },
        QuoranP: { username: "N/A", percentage: 0 },
        PrayerP: { username: "N/A", percentage: 0 },
        SportP: { username: "N/A", percentage: 0 },
        QuranListenP: { username: "N/A", percentage: 0 },
        Improvement15minP: { username: "N/A", percentage: 0 },
        WakeUpEarlyP: { username: "N/A", percentage: 0 },
      };
      let userCount = 0;
      const nonReadyUserData = []; // Collect non-ready user IDs and lastLogin
      const today = new Date().toISOString().split("T")[0]; // Get today's date (YYYY-MM-DD)

      for (const userId in users) {
        const user = users[userId];
        // Collect users with isReady false
        if (user.isReady !== true) {
          const lastLogin = user.lastLogin || null; // Get lastLogin, if exists
          let lastLoginDisplay = "No login today";
          if (lastLogin) {
            const loginDate = new Date(lastLogin).toISOString().split("T")[0];
            if (loginDate === today) {
              lastLoginDisplay = new Date(lastLogin).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
          }
          nonReadyUserData.push({ userId, lastLogin: lastLoginDisplay });
          continue;
        }
        if (!user.profile || !user.points || !user.tasks) continue;

        // Calculate task percentages
        const taskPercentages = Object.keys(taskKeyMap).reduce(
          (acc, taskId) => {
            const task = user.tasks[taskId] || {};
            const globalTask = globalTasks[taskId] || {};
            const percentage =
              globalTask.numberLimit > 0
                ? Math.round(
                    (task.completionCount / globalTask.numberLimit) * 100
                  )
                : 0;
            const taskKey = taskKeyMap[taskId].key;

            // Update best user if this percentage is higher
            if (percentage > bestUsersTemp[taskKey].percentage) {
              bestUsersTemp[taskKey] = {
                username: user.profile.name || "User",
                percentage,
              };
            }

            return {
              ...acc,
              [taskKey]: percentage,
            };
          },
          {}
        );

        // Score chart data
        scoreChartData.push({
          username: user.profile.name || "User",
          score: user.points.current || 0,
        });

        // Performance table data
        performanceTableData.push({
          username: user.profile.name || "User",
          ...taskPercentages,
        });

        // Sum task percentages for averages
        for (const key in taskPercentages) {
          taskSums[key] += taskPercentages[key];
        }
        userCount++;
      }

      // Calculate task averages
      const taskAverageData = Object.keys(taskSums).map((taskKey) => {
        const taskId = Object.keys(taskKeyMap).find(
          (id) => taskKeyMap[id].key === taskKey
        );
        return {
          task: taskId ? taskKeyMap[taskId].display : taskKey.replace("P", ""),
          average:
            userCount > 0 ? (taskSums[taskKey] / userCount).toFixed(1) : 0,
        };
      });

      // Sort score data by score (descending) for chart
      scoreChartData.sort((a, b) => b.score - a.score);

      // Debug: Log task averages for verification
      console.log("Task Averages:", taskAverageData);

      setScoreData(scoreChartData);
      setPerformanceData(performanceTableData);
      setTaskAverages(taskAverageData);
      setNonReadyUsers(nonReadyUserData); // Set non-ready users with login data

      Swal.fire({
        icon: "success",
        title: "Data Fetched",
        text: "All user data has been loaded successfully.",
      });
    } catch (error) {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Failed",
        text: "Failed to fetch user data.",
      });
    }
  };

  const clearCharts = () => {
    setScoreData([]);
    setPerformanceData([]);
    setTaskAverages([]);
    setNonReadyUsers([]); // Clear non-ready users
    Swal.fire({
      icon: "success",
      title: "Charts Cleared",
      text: "All charts and tables have been cleared.",
    });
  };

  // Find top and worst tasks
  const topTask =
    taskAverages.length > 0
      ? taskAverages.reduce((prev, curr) =>
          parseFloat(curr.average) > parseFloat(prev.average) ? curr : prev
        )
      : { task: "N/A", average: 0 };
  const worstTask =
    taskAverages.length > 0
      ? taskAverages.reduce((prev, curr) =>
          parseFloat(curr.average) < parseFloat(prev.average) ? curr : prev
        )
      : { task: "N/A", average: 0 };

  // Calculate overall performance (average of all task averages)
  const overallPerformance =
    taskAverages.length > 0
      ? (
          taskAverages.reduce(
            (sum, task) => sum + parseFloat(task.average),
            0
          ) / taskAverages.length
        ).toFixed(1)
      : 0;

  // Calculate task difficulty
  const taskDifficulty = {
    Easy: [],
    Medium: [],
    Hard: [],
  };

  taskAverages.forEach((task) => {
    const avg = parseFloat(task.average);
    if (avg > 80) {
      taskDifficulty.Easy.push(task.task);
    } else if (avg >= 50 && avg <= 80) {
      taskDifficulty.Medium.push(task.task);
    } else if (avg <= 30) {
      taskDifficulty.Hard.push(task.task);
    }
  });

  // Chart.js data and options
  const chartData = {
    labels: scoreData.map((item) => item.username),
    datasets: [
      {
        label: "Score",
        data: scoreData.map((item) => item.score),
        backgroundColor: scoreData.map((_, index) => {
          const ctx = document.createElement("canvas").getContext("2d");
          const gradient = ctx.createLinearGradient(0, 0, 200, 0);
          gradient.addColorStop(0, "#a855f7"); // Purple
          gradient.addColorStop(1, "#3b82f6"); // Blue
          return gradient;
        }),
        borderColor: "#ffffff",
        borderWidth: 2,
        barThickness: 20,
        hoverBackgroundColor: scoreData.map(() => "#ec4899"), // Pink on hover
      },
    ],
  };

  const chartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: { label: (context) => `${context.parsed.x} points` },
      },
      datalabels: {
        anchor: "end",
        align: "end",
        offset: 5,
        color: "#000000",
        font: {
          size: window.innerWidth < 640 ? 12 : 15.6,
          weight: "bold",
        },
        formatter: (value) => value,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Score",
          font: { size: window.innerWidth < 640 ? 14 : 18.2 },
        },
        ticks: { font: { size: window.innerWidth < 640 ? 12 : 15.6 } },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: "",
          font: { size: window.innerWidth < 640 ? 14 : 18.2 },
        },
        ticks: {
          font: { size: window.innerWidth < 640 ? 12 : 15.6 },
          padding: window.innerWidth < 640 ? 10 : 20,
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
        },
        grid: { display: false },
      },
    },
    layout: {
      padding: {
        top: window.innerWidth < 640 ? 20 : 26,
        right: window.innerWidth < 640 ? 20 : 39,
        bottom: window.innerWidth < 640 ? 80 : 130,
        left: window.innerWidth < 640 ? 10 : 20,
      },
    },
    elements: {
      bar: {
        borderRadius: 4,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        shadowBlur: 5,
        shadowColor: "rgba(0, 0, 0, 0.3)",
      },
    },
  };

  const styles = {
    container: {
      padding: "20px",
      marginTop: "60px",
      maxWidth: "1200px",
      marginLeft: "auto",
      marginRight: "auto",
    },
    card: {
      borderRadius: "12px",
      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
      background: "linear-gradient(135deg, #ffffff, #f8f9fa)",
      border: "2px solid #2dd4bf", // Teal border
      transition: "transform 0.2s ease-in-out",
    },
    cardBody: {
      padding: "20px",
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      marginBottom: "20px",
      color: "#343a40",
    },
    progressContainer: {
      maxWidth: "300px",
      margin: "0 auto",
    },
    progressBar: {
      height: "20px",
      backgroundColor: "#e9ecef",
      borderRadius: "4px",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      transition: "width 0.3s ease-in-out",
    },
    difficultyContainer: {
      maxWidth: "600px",
      margin: "0 auto",
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
      zIndex: -1,
    },
  };

  return (
    <div style={styles.container}>
      <video autoPlay loop muted style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={styles.videoOverlay}></div>

      <h2 style={styles.title} className="text-center mb-4">
        <i
          className="bi bi-graph-up-arrow me-2"
          style={{ color: "#3b82f6" }}
        ></i>
        Admin Score Dashboard
      </h2>

      <div className="row g-4">
        {/* First Row: Performance Overview and Task Difficulty */}
        <div className="col-12 col-md-6">
          <div
            style={styles.card}
            className="card h-100 hover:scale-105 transition-transform"
          >
            <div style={styles.cardBody}>
              <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                <i
                  className="bi bi-star-fill me-2"
                  style={{ color: "#a855f7" }}
                ></i>
                Performance Overview
              </h3>
              <div className="space-y-2 text-center">
                <p className="text-base sm:text-lg font-bold text-green-600">
                  <i
                    className="bi bi-trophy-fill mr-2"
                    style={{ color: "#2dd4bf" }}
                  ></i>
                  Top Task: {topTask.task} ({topTask.average}%)
                </p>
                <p className="text-base sm:text-lg font-bold text-red-600">
                  <i
                    className="bi bi-exclamation-circle-fill mr-2"
                    style={{ color: "#ec4899" }}
                  ></i>
                  Worst Task: {worstTask.task} ({worstTask.average}%)
                </p>
                <p className="text-base sm:text-lg font-bold text-blue-600">
                  <i
                    className="bi bi-bar-chart-fill mr-2"
                    style={{ color: "#3b82f6" }}
                  ></i>
                  Overall Performance: {overallPerformance}%
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div
            style={styles.card}
            className="card h-100 hover:scale-105 transition-transform"
          >
            <div style={styles.cardBody}>
              <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                <i
                  className="bi bi-speedometer2 me-2"
                  style={{ color: "#f97316" }}
                ></i>
                Task Difficulty
              </h3>
              <div className="space-y-2 text-center">
                <p className="text-base sm:text-lg">
                  <span className="font-semibold text-green-600">
                    <i
                      className="bi bi-check-circle-fill mr-2"
                      style={{ color: "#2dd4bf" }}
                    ></i>
                    Easy (&gt;80%):
                  </span>{" "}
                  {taskDifficulty.Easy.length > 0
                    ? taskDifficulty.Easy.join(", ")
                    : "None"}
                </p>
                <p className="text-base sm:text-lg">
                  <span className="font-semibold text-yellow-600">
                    <i
                      className="bi bi-dash-circle-fill mr-2"
                      style={{ color: "#f97316" }}
                    ></i>
                    Medium (50%–80%):
                  </span>{" "}
                  {taskDifficulty.Medium.length > 0
                    ? taskDifficulty.Medium.join(", ")
                    : "None"}
                </p>
                <p className="text-base sm:text-lg">
                  <span className="font-semibold text-red-600">
                    <i
                      className="bi bi-x-circle-fill mr-2"
                      style={{ color: "#ec4899" }}
                    ></i>
                    Hard (≤30%):
                  </span>{" "}
                  {taskDifficulty.Hard.length > 0
                    ? taskDifficulty.Hard.join(", ")
                    : "None"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Weekly Performance Goals */}
      {taskAverages.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div
              style={styles.card}
              className="card hover:scale-105 transition-transform"
            >
              <div style={styles.cardBody}>
                <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                  <i
                    className="bi bi-target me-2"
                    style={{ color: "#a855f7" }}
                  ></i>
                  Weekly Performance Goals
                </h3>
                <div style={styles.progressContainer} className="space-y-4">
                  {["Book", "Quran", "Sport", "Prayer"].map((taskName) => {
                    const avg = parseFloat(
                      taskAverages.find((t) => t.task === taskName)?.average ||
                        0
                    );
                    const goal = taskGoals[taskName];
                    const progress = Math.min((avg / goal) * 100, 100);
                    console.log(
                      `Task: ${taskName}, Avg: ${avg}, Goal: ${goal}, Progress: ${progress}%`
                    );
                    return (
                      <div key={taskName} className="task-progress">
                        <span className="block mb-1 text-sm">
                          {taskName}: {avg.toFixed(1)}% / {goal}%
                        </span>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${progress}%`,
                              backgroundColor:
                                avg >= goal ? "#2dd4bf" : "#f97316",
                            }}
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fetch and Clear Buttons */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
            <button
              onClick={fetchAllUserData}
              className="btn btn-primary w-full sm:w-auto"
              style={{ backgroundColor: "#3b82f6", borderColor: "#3b82f6" }}
            >
              <i className="bi bi-cloud-download-fill me-2"></i>Fetch Data
            </button>
            <button
              onClick={clearCharts}
              className="btn btn-danger w-full sm:w-auto"
              style={{ backgroundColor: "#ec4899", borderColor: "#ec4899" }}
            >
              <i className="bi bi-trash-fill me-2"></i>Clear Charts
            </button>
          </div>
        </div>
      </div>

      {/* Score Chart */}
      {scoreData.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div
              style={styles.card}
              className="card hover:scale-105 transition-transform"
            >
              <div style={styles.cardBody}>
                <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                  <i
                    className="bi bi-bar-chart-line-fill me-2"
                    style={{ color: "#3b82f6" }}
                  ></i>
                  User Scores (Ranked)
                </h3>
                <div
                  style={{
                    height: window.innerWidth < 640 ? "400px" : "520px",
                  }}
                >
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Table */}
      {performanceData.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div
              style={styles.card}
              className="card hover:scale-105 transition-transform"
            >
              <div style={styles.cardBody}>
                <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                  <i
                    className="bi bi-table me-2"
                    style={{ color: "#a855f7" }}
                  ></i>
                  User Performances
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full table-bordered table-striped text-sm sm:text-base">
                    <thead>
                      <tr
                        style={{
                          background:
                            "linear-gradient(to right, #a855f7, #3b82f6)",
                          color: "#ffffff",
                        }}
                      >
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Username</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Book (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Quran (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">
                          Prayer (%)
                        </th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Sport (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">
                          Quran Listen (%)
                        </th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">
                          Improvement (%)
                        </th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">
                          Wake Up (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.map((user, index) => (
                        <tr
                          key={index}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-teal-100 transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold">
                            {user.username}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.BookP}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.QuoranP}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.PrayerP}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.SportP}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.QuranListenP}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.Improvement15minP}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.WakeUpEarlyP}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Averages Table */}
      {taskAverages.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div
              style={styles.card}
              className="card hover:scale-105 transition-transform"
            >
              <div style={styles.cardBody}>
                <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                  <i
                    className="bi bi-pie-chart-fill me-2"
                    style={{ color: "#ec4899" }}
                  ></i>
                  Task Average Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full table-bordered table-striped text-sm sm:text-base">
                    <thead>
                      <tr
                        style={{
                          background:
                            "linear-gradient(to right, #f97316, #ec4899)",
                          color: "#ffffff",
                        }}
                      >
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Task</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">
                          Average Performance (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskAverages.map((task, index) => (
                        <tr
                          key={index}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-teal-100 transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {task.task}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {task.average}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-Ready Users Section */}
      {nonReadyUsers.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div
              style={styles.card}
              className="card hover:scale-105 transition-transform"
            >
              <div style={styles.cardBody}>
                <h3 style={{ ...styles.title, fontSize: "1.25rem" }}>
                  <i
                    className="bi bi-exclamation-triangle-fill me-2"
                    style={{ color: "#dc3545" }}
                  ></i>
                  Non-Ready Users (Pending Punishment)
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full table-bordered table-striped text-sm sm:text-base">
                    <thead>
                      <tr
                        style={{
                          background:
                            "linear-gradient(to right, #dc3545, #6c757d)",
                          color: "#ffffff",
                        }}
                      >
                        <th className="py-2 sm:py-3 px-2 sm:px-4">User ID</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">
                          Last Login Today
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonReadyUsers.map((user, index) => (
                        <tr
                          key={index}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-red-100 transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.userId}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            {user.lastLogin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScorePage;
