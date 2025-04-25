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
  const [bestUsers, setBestUsers] = useState({});
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
    improvement_15min: { key: "Improvement15minP", display: "Improvement15min" },
    wake_up_early: { key: "WakeUpEarlyP", display: "WakeUpEarly" },
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

      for (const userId in users) {
        const user = users[userId];
        if (!user.profile || !user.points || !user.tasks) continue;

        // Calculate task percentages
        const taskPercentages = Object.keys(taskKeyMap).reduce((acc, taskId) => {
          const task = user.tasks[taskId] || {};
          const globalTask = globalTasks[taskId] || {};
          const percentage =
            globalTask.numberLimit > 0
              ? Math.round((task.completionCount / globalTask.numberLimit) * 100)
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
        }, {});

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
          average: userCount > 0 ? (taskSums[taskKey] / userCount).toFixed(1) : 0,
        };
      });

      // Sort score data by score (descending) for chart
      scoreChartData.sort((a, b) => b.score - a.score);

      // Debug logging
      console.log("Task Sums:", taskSums);
      console.log("Task Averages:", taskAverageData);
      console.log("Best Users:", bestUsersTemp);

      setScoreData(scoreChartData);
      setPerformanceData(performanceTableData);
      setTaskAverages(taskAverageData);
      setBestUsers(bestUsersTemp);

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
    setBestUsers({});
    Swal.fire({
      icon: "success",
      title: "Charts Cleared",
      text: "All charts and tables have been cleared.",
    });
  };

  // Find top and worst tasks
  const topTask = taskAverages.length > 0
    ? taskAverages.reduce((prev, curr) =>
        parseFloat(curr.average) > parseFloat(prev.average) ? curr : prev
      )
    : { task: "N/A", average: 0 };
  const worstTask = taskAverages.length > 0
    ? taskAverages.reduce((prev, curr) =>
        parseFloat(curr.average) < parseFloat(prev.average) ? curr : prev
      )
    : { task: "N/A", average: 0 };

  // Chart.js data and options (unchanged)
  const chartData = {
    labels: scoreData.map((item) => item.username),
    datasets: [
      {
        label: "Score",
        data: scoreData.map((item) => item.score),
        backgroundColor: scoreData.map((_, index) => {
          const ctx = document.createElement("canvas").getContext("2d");
          const gradient = ctx.createLinearGradient(0, 0, 200, 0);
          gradient.addColorStop(0, "#4f46e5");
          gradient.addColorStop(1, "#10b981");
          return gradient;
        }),
        borderColor: "#ffffff",
        borderWidth: 2,
        barThickness: 20,
        hoverBackgroundColor: scoreData.map(() => "#8b5cf6"),
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
    containerFluid: { padding: 0, overflow: "hidden" },
    dashboardContent: {
      marginTop: "70px",
      padding: "10px",
      flex: 1,
    },
    scoreFormCard: {
      borderRadius: "12px",
      background: "url('https://www.transparenttextures.com/patterns/parchment.jpg')",
      border: "2px solid #d4a017",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: "20px",
      marginTop: "10px",
      width: "100%",
      position: "relative",
      overflow: "hidden",
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
      zIndex: 0,
    },
  };

  return (
    <div style={styles.containerFluid}>
      <video autoPlay loop muted style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={styles.videoOverlay}></div>

      <div
        style={styles.dashboardContent}
        className="container-fluid px-2 sm:px-4 md:px-10"
      >
        <div className="flex flex-col space-y-4">
          <div style={styles.scoreFormCard} className="card shadow-sm">
            <h3 className="text-center text-xl sm:text-2xl font-bold text-[#d4a017] mb-4">
              Admin Score Dashboard
            </h3>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
              <button
                onClick={fetchAllUserData}
                className="btn btn-primary w-full sm:w-auto"
              >
                Fetch Data
              </button>
              <button
                onClick={clearCharts}
                className="btn btn-danger w-full sm:w-auto"
              >
                Clear Charts
              </button>
            </div>

            {/* Score Chart */}
            {scoreData.length > 0 && (
              <div
                className="rounded-lg border-2 border-[#d4a017] w-full"
                style={{
                  height: window.innerWidth < 640 ? "400px" : "520px",
                  backgroundColor: "white",
                }}
              >
                <h4 className="text-center text-base sm:text-lg font-semibold mb-2">
                  User Scores (Ranked)
                </h4>
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}

            {/* Performance Table */}
            {performanceData.length > 0 && (
              <div>
                <h4 className="text-center text-base sm:text-lg font-semibold mb-2">
                  User Performances
                </h4>
                <div
                  className="overflow-x-auto max-w-full"
                  style={styles.scoreFormCard}
                >
                  <table className="table w-full rounded-lg shadow-lg text-sm sm:text-base">
                    <thead>
                      <tr className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white">
                        <th className="py-2 sm:py-3 px-2 sm:px-4 rounded-tl-lg">
                          Username
                        </th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Book (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Quran (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Prayer (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Sport (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Quran Listen (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Improvement (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4 rounded-tr-lg">
                          Wake Up (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.map((user, index) => (
                        <tr
                          key={index}
                          className={`${
                            index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                          } hover:bg-yellow-100 transition-colors duration-200`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold">
                            {user.username}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.BookP}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.QuoranP}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.PrayerP}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.SportP}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.QuranListenP}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.Improvement15minP}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{user.WakeUpEarlyP}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Task Averages Table */}
            {taskAverages.length > 0 && (
              <div>
                <h4 className="text-center text-base sm:text-lg font-semibold mb-2">
                  Task Average Performance
                </h4>
                <div
                  className="mb-4 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6"
                  style={styles.scoreFormCard}
                >
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                      <i className="bi bi-trophy-fill mr-2"></i> Top Task: {topTask.task} (
                      {topTask.average}%)
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl font-bold text-red-600">
                      <i className="bi bi-exclamation-triangle-fill mr-2"></i> Worst Task:{" "}
                      {worstTask.task} ({worstTask.average}%)
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto max-w-full">
                  <table className="table w-full table-bordered table-striped text-sm sm:text-base">
                    <thead>
                      <tr>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Task</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Average Performance (%)</th>
                        <th className="py-2 sm:py-3 px-2 sm:px-4">Best User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskAverages.map((task, index) => {
                        const taskKey = Object.values(taskKeyMap).find(
                          (t) => t.display === task.task
                        )?.key || `${task.task}P`;
                        return (
                          <tr key={index}>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">{task.task}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">{task.average}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              {bestUsers[taskKey]?.username || "N/A"} (
                              {bestUsers[taskKey]?.percentage || 0}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminScorePage;