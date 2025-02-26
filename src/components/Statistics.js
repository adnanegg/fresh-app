import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, onValue, update, set } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { Chart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "chart.js/auto";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
// import "./styles/Statistics.css";

const Statistics = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "profile-images/default-profile.png",
    rankName: "Warrior",
    rankImage: "ranking-images/rank-warrior.png"
  });
  const [tasks, setTasks] = useState([]);
  const [taskHistory, setTaskHistory] = useState({});
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [isReportVisible, setIsReportVisible] = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      navigate("/statistics");
      return;
    }

    const fetchUserData = async () => {
      setIsLoading(true); // Start loading
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserProfile(data.profile || {
            name: "User",
            photo: "profile-images/default-profile.png",
            rankName: "Warrior",
            rankImage: "ranking-images/rank-warrior.png"
          });
          setTasks(data.tasks || []);
          setTaskHistory(data.taskHistory || {});

          if (!data.profile?.signupDate) {
            const signupDate = new Date().toISOString().split("T")[0];
            update(ref(database, `users/${userId}/profile`), { signupDate })
              .then(() => setUserProfile((prev) => ({ ...prev, signupDate })))
              .catch((error) => console.error("Error setting signupDate:", error));
          }
        }
        setIsLoading(false); // End loading
      }, (error) => {
        console.error("Firebase error:", error);
        setIsLoading(false); // End loading on error
      });
    };

    fetchUserData();
  }, [navigate]);

  const toggleReport = () => {
    setIsReportVisible(!isReportVisible);
  };

  // Helper function to get week boundaries (Saturday 5 AM to Friday 11:59 PM local time)
  const getWeekBoundaries = () => {
    const now = new Date();
    const localTime = now.getTime() - now.getTimezoneOffset() * 60000; // Adjust for local timezone
    const localDate = new Date(localTime);

    // Find the most recent Saturday at 5 AM
    let start = new Date(localDate);
    start.setHours(5, 0, 0, 0); // Set to 5 AM
    while (start.getDay() !== 6) { // 6 = Saturday
      start.setDate(start.getDate() - 1);
    }

    // Find the following Friday at 11:59 PM
    let end = new Date(start);
    end.setDate(end.getDate() + 6); // Move to Friday
    end.setHours(23, 59, 59, 999); // Set to 11:59 PM

    return { start, end };
  };

  // Calculate weeks since signup
  const getWeeksSinceSignup = (signupDate) => {
    if (!signupDate) return 1; // Default to 1 week if signupDate is missing
    const signup = new Date(signupDate);
    const { start: weekStart } = getWeekBoundaries();
    const weeks = Math.floor((weekStart - signup) / (7 * 24 * 60 * 60 * 1000));
    return weeks > 0 ? weeks : 1; // Ensure at least 1 week
  };

  // Calculate performance for a task
  const calculateTaskPerformance = (task) => {
    const signupDate = userProfile?.signupDate;
    if (!signupDate || !task || !task.frequencyUnit) {
      console.log("Missing data for task:", task);
      return { overall: 0, weekly: 0, details: { overallCompletions: 0, weeklyCompletions: 0 } };
    }

    const weeksSinceSignup = getWeeksSinceSignup(signupDate);
    const { start: weekStart, end: weekEnd } = getWeekBoundaries();
    const now = new Date();

    let overallCompletions = 0;
    let weeklyCompletions = 0;

    Object.entries(taskHistory).forEach(([date, tasksData]) => {
      const taskDate = new Date(date);
      if (taskDate >= new Date(signupDate) && taskDate <= now) {
        if (task.frequencyUnit === "days") {
          if (tasksData[task.name]?.completed) {
            overallCompletions += 1;
          }
          if (taskDate >= weekStart && taskDate <= weekEnd && tasksData[task.name]?.completed) {
            weeklyCompletions += 1;
          }
        } else if (task.frequencyUnit === "times") {
          const completions = tasksData[task.name]?.completions || 0;
          overallCompletions += completions;
          if (taskDate >= weekStart && taskDate <= weekEnd) {
            weeklyCompletions += completions;
          }
        }
      }
    });

    const weeklyFrequency = task.weeklyFrequency || 0;
    const requiredCompletions = task.requiredCompletions || 0;

    const requiredOverall = task.frequencyUnit === "days"
      ? weeklyFrequency * weeksSinceSignup
      : requiredCompletions * weeksSinceSignup;
    const requiredWeekly = task.frequencyUnit === "days" ? weeklyFrequency : requiredCompletions;

    if (requiredOverall === 0 || requiredWeekly === 0) {
      console.log(`Invalid required value for ${task.name}`);
    }

    const overallPerformance = requiredOverall > 0 ? (overallCompletions / requiredOverall) * 100 : 0;
    const weeklyPerformance = requiredWeekly > 0 ? (weeklyCompletions / requiredWeekly) * 100 : 0;

    return {
      overall: overallPerformance,
      weekly: weeklyPerformance,
      details: { overallCompletions, weeklyCompletions, requiredOverall, requiredWeekly }
    };
  };

  // Calculate overall performance across all tasks
  const calculateOverallPerformance = () => {
    if (!tasks.length) return { overall: 0, weekly: 0 };
    const performances = tasks.map(calculateTaskPerformance).filter(perf => perf.overall !== undefined && perf.weekly !== undefined);
    const overallAvg = performances.length > 0 ? performances.reduce((sum, perf) => sum + perf.overall, 0) / performances.length : 0;
    const weeklyAvg = performances.length > 0 ? performances.reduce((sum, perf) => sum + perf.weekly, 0) / performances.length : 0;
    console.log(`Overall Performance: ${overallAvg}%, Weekly Performance: ${weeklyAvg}%`);
    return { overall: overallAvg, weekly: weeklyAvg };
  };

  const { overall: overallPerformance, weekly: overallWeeklyPerformance } = calculateOverallPerformance();

  // Chart data for overall performance
  const overallChartData = {
    labels: ["Completed", "Incomplete"],
    datasets: [{
      data: [overallPerformance || 0, 100 - (overallPerformance || 0)],
      backgroundColor: ["#28a745", "#6c757d"],
      hoverOffset: 4,
    }],
  };

  // Chart data for individual tasks, excluding Bonus tasks
  const individualChartData = {
    labels: tasks.filter(task => task.category !== "Bonus").map(task => task.name).filter(Boolean),
    datasets: [{
      label: "Performance (%)",
      data: tasks.filter(task => task.category !== "Bonus").map(task => calculateTaskPerformance(task).overall || 0).filter(Boolean),
      backgroundColor: "#28a745",
      borderColor: "#28a745",
      borderWidth: 1,
    }],
  };

  // Chart data for weekly performance (includes all tasks)
  const weeklyChartData = {
    labels: tasks.map(task => task.name).filter(Boolean),
    datasets: [{
      label: "Weekly Performance (%)",
      data: tasks.map(task => calculateTaskPerformance(task).weekly || 0).filter(Boolean),
      backgroundColor: "#28a745",
      borderColor: "#28a745",
      borderWidth: 1,
    }],
  };

  const overallWeeklyChartData = {
    labels: ["Completed", "Incomplete"],
    datasets: [{
      data: [overallWeeklyPerformance || 0, 100 - (overallWeeklyPerformance || 0)],
      backgroundColor: ["#28a745", "#6c757d"],
      hoverOffset: 4,
    }],
  };

  const chartOptions = {
    plugins: {
      legend: { display: false },
      datalabels: {
        color: "#fff",
        font: { weight: "bold" },
        formatter: (value) => `${Math.round(value || 0)}%`,
        anchor: "end",
        align: "start",
        offset: 0,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { display: false },
        grid: { display: false },
      },
      x: {
        grid: { display: false },
      },
    },
    maintainAspectRatio: false,
  };

  const styles = {
    containerFluid: { padding: 0 },
    topBar: {
      position: "fixed",
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
    logo: {
      width: "40px",
      height: "40px",
      marginRight: "10px",
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
    profileAvatar: { position: "relative", display: "inline-block", paddingLeft: "10px" },
    sidebarProfileIcon: { width: "40px", height: "40px", border: "2px solid #007bff" },
    dashboardContent: {
      marginTop: "60px", // Space for the top bar
      transition: "none", // Remove transition since no expansion/contraction
      flex: 1,
      padding: "20px",
    },
    dashboardCard: {
      borderRadius: "8px",
      border: "1px solid #e9ecef",
      background: "white",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
    },
    // ... (keep or add other styles as needed for chart-container, report-section, etc.)
  };

  return (
    <div style={styles.containerFluid}>
      <div style={styles.topBar}>
        <img src="/trackerLogo.png" alt="xAI Logo" style={styles.logo} />
        <Link to="/dashboard" style={styles.topBarLink}>
          <i className="bi bi-house-fill" style={styles.topBarIcon}></i>
          Dashboard
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
        <div style={styles.profileAvatar}>
          <Link to="/profile">
            <img
              src={userProfile.photo || "profile-images/default-profile.png"}
              alt="Profile"
              style={styles.sidebarProfileIcon}
              className="rounded-circle"
            />
          </Link>
        </div>
      </div>
      <div style={styles.dashboardContent} className="statistics-content">
        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="card dashboard-card shadow-sm">
            <div className="card-body p-3">
              <h5 className="card-title text-primary mb-3">Performance Statistics</h5>

              {/* Overall Statistics Section */}
              <div className="mb-5">
                <h4 className="text-dark mb-3 border-bottom pb-2">Overall Statistics</h4>
                <div className="row g-3">
                  <div className="col-12 col-md-6 mb-4">
                    <h6 className="text-dark small">Overall Performance (Since Signup): {Math.round(overallPerformance || 0)}%</h6>
                    <div className="chart-container" style={{ height: "200px" }}>
                      <Chart
                        type="pie"
                        data={overallChartData}
                        options={chartOptions}
                        plugins={[ChartDataLabels]}
                      />
                    </div>
                    <button
                      onClick={toggleReport}
                      className="btn btn-link p-0 text-primary small"
                    >
                      Learn More About This
                    </button>
                    {isReportVisible && (
                      <div className="report-section mt-3 p-3 bg-light rounded" style={{ border: "1px solid #e9ecef" }}>
                        <h6 className="text-dark small mb-2">Statistics Report</h6>
                        <p className="text-muted small">
                          <strong>Formulas and Methods Used:</strong><br />
                          <strong>Overall Performance:</strong> Average of individual task performances since signup.<br />
                          <strong>Individual Task Performance (Since Signup):</strong> For each task: (Completed / Required) * 100 since signup date.<br />
                          <strong>Overall Weekly Performance:</strong> Average of weekly performances for all tasks in the current week (Sat 5 AM to Fri 11:59 PM).<br />
                          <strong>Weekly Task Performance:</strong> For each task: (Completed in Week / Required in Week) * 100.<br />
                          Example calculations provided in context.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-6 mb-4">
                    <h6 className="text-dark small">Overall Weekly Performance (Feb 15–Feb 21, 2025): {Math.round(overallWeeklyPerformance || 0)}%</h6>
                    <div className="chart-container" style={{ height: "200px" }}>
                      <Chart
                        type="pie"
                        data={overallWeeklyChartData}
                        options={chartOptions}
                        plugins={[ChartDataLabels]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Statistics Section */}
              <div>
                <h4 className="text-dark mb-3 border-bottom pb-2">Individual Statistics</h4>
                <div className="row g-3">
                  <div className="col-12 mb-4">
                    <h6 className="text-dark small">Individual Task Performance (Since Signup)</h6>
                    <div className="chart-container" style={{ height: "200px" }}>
                      <Chart
                        type="bar"
                        data={individualChartData}
                        options={{
                          ...chartOptions,
                          scales: {
                            ...chartOptions.scales,
                            x: { title: { display: true, text: "Tasks", font: { size: 12 } } },
                            y: { title: { display: true, text: "Performance (%)", font: { size: 12 } } },
                          },
                        }}
                        plugins={[ChartDataLabels]}
                      />
                    </div>
                    <p className="text-muted small">
                      {tasks.filter(task => task.category !== "Bonus").map((task) => {
                        const { overall, details } = calculateTaskPerformance(task);
                        return `${task.name}: ${Math.round(overall || 0)}% (${details.overallCompletions}/${task.frequencyUnit === "days" ? (task.weeklyFrequency || 0) * getWeeksSinceSignup(userProfile?.signupDate) : (task.requiredCompletions || 0) * getWeeksSinceSignup(userProfile?.signupDate)} ${task.frequencyUnit === "days" ? "days" : "completions"})`;
                      }).filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="col-12">
                    <h6 className="text-dark small">Weekly Task Performance (Feb 15–Feb 21, 2025)</h6>
                    <div className="chart-container" style={{ height: "200px" }}>
                      <Chart
                        type="bar"
                        data={weeklyChartData}
                        options={{
                          ...chartOptions,
                          scales: {
                            ...chartOptions.scales,
                            x: { title: { display: true, text: "Tasks", font: { size: 12 } } },
                            y: { title: { display: true, text: "Performance (%)", font: { size: 12 } } },
                          },
                        }}
                        plugins={[ChartDataLabels]}
                      />
                    </div>
                    <p className="text-muted small">
                      {tasks.map((task) => {
                        const { weekly, details } = calculateTaskPerformance(task);
                        return `${task.name}: ${Math.round(weekly || 0)}% (${details.weeklyCompletions}/${task.frequencyUnit === "days" ? (task.weeklyFrequency || 0) : (task.requiredCompletions || 0)} ${task.frequencyUnit === "days" ? "days" : "completions"})`;
                      }).filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;