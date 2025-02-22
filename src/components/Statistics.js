import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, onValue, update, set } from "firebase/database";
import { useNavigate,Link } from "react-router-dom";
import { Chart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "chart.js/auto";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/Statistics.css";

// ... (rest of the imports unchanged)

const Statistics = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "profile-images/default-profile.png",
    rankName: "Warrior", rankImage: "ranking-images/rank-warrior.png"
  });
  const [tasks, setTasks] = useState([]);
  const [taskHistory, setTaskHistory] = useState({});
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isReportVisible, setIsReportVisible] = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      navigate("/statistics");
      return;
    }

    const userRef = ref(database, `users/${userId}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data.profile || {
          name: "User",
          photo: "profile-images/default-profile.png",
          signupDate: data.profile?.signupDate || null,
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
    });
  }, [navigate]);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const toggleReport = () => {
    setIsReportVisible(!isReportVisible);
  };

  // Helper function to get week boundaries (Saturday 5 AM to Friday 11:59 PM local time)
  const getWeekBoundaries = () => {
    const now = new Date(); // Define now here for local time
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
    const now = new Date(); // Define now here for local time in this function

    let overallCompletions = 0;
    let weeklyCompletions = 0;

    Object.entries(taskHistory).forEach(([date, tasksData]) => {
      const taskDate = new Date(date);
      if (taskDate >= new Date(signupDate) && taskDate <= now) {
        if (task.frequencyUnit === "days") {
          if (tasksData[task.name]?.completed) {
            overallCompletions += 1;
            console.log(`Task ${task.name} completed on ${date} (days)`);
          }
          if (taskDate >= weekStart && taskDate <= weekEnd && tasksData[task.name]?.completed) {
            weeklyCompletions += 1;
          }
        } else if (task.frequencyUnit === "times") {
          const completions = tasksData[task.name]?.completions || 0;
          overallCompletions += completions;
          console.log(`Task ${task.name} completed ${completions} times on ${date} (times)`);
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
      console.log(`Invalid required value for ${task.name}: frequencyUnit=${task.frequencyUnit}, weeklyFrequency=${weeklyFrequency}, requiredCompletions=${requiredCompletions}`);
    }

    const overallPerformance = requiredOverall > 0 ? (overallCompletions / requiredOverall) * 100 : 0;
    const weeklyPerformance = requiredWeekly > 0 ? (weeklyCompletions / requiredWeekly) * 100 : 0;

    console.log(`Task ${task.name} - Overall: ${overallPerformance}%, Weekly: ${weeklyPerformance}%`);

    return {
      overall: overallPerformance,
      weekly: weeklyPerformance,
      details: { overallCompletions, weeklyCompletions, requiredOverall, requiredWeekly },
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

  const { overall: overallPerformance, weekly: weeklyPerformance } = calculateOverallPerformance();

  // Chart data for overall performance
  const overallChartData = {
    labels: ["Completed", "Incomplete"],
    datasets: [{
      data: [overallPerformance || 0, 100 - (overallPerformance || 0)],
      backgroundColor: ["#28a745", "#6c757d"],
      hoverOffset: 4,
    }],
  };

  // **NEW: Chart data for individual tasks, excluding Bonus tasks**
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

  // Chart data for weekly performance (unchanged, includes all tasks)
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

  return (
    <div className="container-fluid">
      <div className="row">
      {/* Sidebar */}
      <div className={`col-auto p-0 sidebar-container ${isSidebarExpanded ? 'expanded' : ''}`}>
        <div className="sidebar">
          <div className="sidebar-header">
            <img src="/trackerLogo.png" alt="xAI Logo" className="whale-logo" />
            <button
              onClick={toggleSidebar}
              className="btn btn-link text-dark expand-toggle p-0"
              aria-label={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <i className={`bi ${isSidebarExpanded ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
            </button>
          </div>
          <ul className="sidebar-nav list-unstyled d-flex flex-column align-items-start">
            <li className="mb-3 w-100">
              <Link to="/dashboard" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
                <i className="bi bi-house-fill sidebar-icon me-2"></i>
                {isSidebarExpanded && <span className="sidebar-text">Dashboard</span>}
              </Link>
            </li>
            <li className="mb-3 w-100">
              <Link to="/leaderboard" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'} fw-bold`}>
                <i className="bi bi-trophy-fill sidebar-icon me-2"></i>
                {isSidebarExpanded && <span className="sidebar-text">Leaderboard</span>}
              </Link>
            </li>
            <li className="mb-3 w-100">
              <Link to="/profile" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
                <i className="bi bi-person-fill sidebar-icon me-2"></i>
                {isSidebarExpanded && <span className="sidebar-text">Profile</span>}
              </Link>
            </li>
            <li className="mb-3 w-100">
                <Link to="/statistics" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
                  <i className="bi bi-bar-chart-fill sidebar-icon me-2"></i>
                  {isSidebarExpanded && <span className="sidebar-text">Statistics</span>}
                </Link>
              </li>
            <li className="mb-3">
              <div className="profile-avatar">
                <Link to="/profile"><img
                  src={userProfile.photo || "profile-images/default-profile.png"} // You'll need to fetch or pass userProfile here
                  alt="Profile"
                  className="rounded-circle sidebar-profile-icon"
                /></Link>
              </div>
            </li>
          </ul>
        </div>
      </div> 

        {/* Main Content */}
        <div className={`col p-4 statistics-content ${isSidebarExpanded ? 'expanded' : ''}`}>
          <div className="card dashboard-card shadow-sm">
            <div className="card-body p-3">
              <h5 className="card-title text-primary mb-3">Performance Statistics</h5>
              <div className="row g-3">
                <div className="col-12 mb-4">
                  <h6 className="text-dark small">Overall Performance: {Math.round(overallPerformance || 0)}%</h6>
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
                        <strong>Overall Performance:</strong> Calculated as the average of individual task performances since signup. For each task:<br />
                        - If frequencyUnit is "days": `(Completed Days / (weeklyFrequency * WeeksSinceSignup)) * 100`.<br />
                        - If frequencyUnit is "times": `(Total Completions / (requiredCompletions * WeeksSinceSignup)) * 100`.<br />
                        WeeksSinceSignup = Floor((Current Week Start - Signup Date) / (7 days)).<br />
                        Example: For “Read a Book” (7 days/week, 15 completed days over 3 weeks), performance = (15 / (7 * 3)) * 100 = 71%.<br />
                        For “Exercise” (5 times/week, 12 completions over 3 weeks), performance = (12 / (5 * 3)) * 100 = 80%.<br />
                        Overall = (71% + 80%) / 2 = 75.5% ≈ 76%.<br />
                        <strong>Weekly Performance:</strong> Calculated for the current week (Saturday 5 AM to Friday 11:59 PM local time). For each task:<br />
                        - If frequencyUnit is "days": `(Completed Days in Week / weeklyFrequency) * 100`.<br />
                        - If frequencyUnit is "times": `(Completions in Week / requiredCompletions) * 100`.<br />
                        Example: For Feb 15–Feb 21, 2025, “Read a Book” (5/7 days) = 71%, “Exercise” (3/5 completions) = 60%, Weekly = (71% + 60%) / 2 = 65.5% ≈ 66%.<br />
                        <strong>Individual Task Performance:</strong> Same as overall for each task, using the respective formula, excluding tasks with category "Bonus".<br />
                        <strong>Method:</strong> Realtime data fetched from Firebase, processed with JavaScript Date for week boundaries, and visualized with Chart.js for pie (overall) and bar (individual/weekly) charts.
                      </p>
                    </div>
                  )}
                </div>
                <div className="col-12 mb-4">
                  <h6 className="text-dark small">Individual Task Performance</h6>
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
                  <h6 className="text-dark small">Weekly Performance (Feb 15–Feb 21, 2025): {Math.round(weeklyPerformance || 0)}%</h6>
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
      </div>
    </div>
  );
};

export default Statistics;