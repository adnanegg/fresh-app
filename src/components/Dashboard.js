import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate,Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import Swal from "sweetalert2";
import "./styles/Dashboard.css";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "bootstrap-icons/font/bootstrap-icons.css"; // Import Bootstrap Icons (optional)

// Ranking configuration
const rankingConfig = {
  thresholds: [20000, 100000, 300000, 500000, 1000000], // XP thresholds for each rank
  ranks: ["Warrior", "Master", "Grand Master", "Legend", "Mythic"], // Rank names
  images: [
    "ranking-images/rank-warrior.png",
    "ranking-images/rank-master.png",
    "ranking-images/rank-grandmaster.png",
    "ranking-images/rank-legend.png",
    "ranking-images/rank-mythic.png",
  ],
  levelUpMessages: [
    "Warrior status unlocked! Your journey blazes with strength and courage!",
    "You did it! As a Master, your name now sparks awe and respect!",
    "Grand Master achieved! You wield power and wisdom like a true champion!",
    "Legend mode: activated! Your deeds are etched into the chronicles of greatness!",
    "Mythic rank reached! You've become a living legend—an icon of the ages!"
  ], // Rank images
};

// Configurable bonus values
const BONUS_POINTS = 10; // Default bonus points (configurable)
const BONUS_XP = 500; // Default bonus XP (configurable)

// Define boost types and their effects
const BOOSTS = {
  "5xBonus": { multiplier: 5, type: "bonus", description: "Multiplies bonus XP and points by 5 when reaching completion limit" },
  "DoubleEverything": { multiplier: 2, type: "all", description: "Doubles XP, points, and bonuses for this task" },
  "+30Percent": { percentage: 0.3, type: "all", description: "Increases XP, points, and bonuses by 30% for this task" },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "profile-images/default-profile.png",
    rankName: "Warrior", rankImage: "ranking-images/rank-warrior.png"
  });
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [xpData, setXpData] = useState({ current: 0, level: 1 });
  const [pointsData, setPointsData] = useState({ current: 0, total: 900 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 3000 });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // New state for sidebar expansion
  const [notifications, setNotifications] = useState([]); // State for task completion notifications

  // Check if the user is authenticated
  useEffect(() => {
    const fetchUserData = async (userId) => {
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
     
            setUserProfile(data.profile || { name: "User", photo: "/profile-photos/default-profile.png" });
            setTasks(data.tasks || []);
            setCompletedTasks(data.completedTasks || []);
            setXpData(data.xp || { current: 0, level: 1 });
            setPointsData(data.points || { current: 0, total: 900 });
            setMpointsData(data.Mpoints || { current: 0, total: 3000 });

           // Update rank based on XP
    // Update rank based on XP
const userXp = data.xp?.current || 0;
const currentLevel = data.xp?.level || 1;
const currentThreshold = rankingConfig.thresholds[currentLevel - 1] || 100; // Get the current threshold

// Check if the user has leveled up
if (userXp >= currentThreshold) {
    const newLevel = currentLevel + 1; // Increment the level
    const newRankIndex = rankingConfig.thresholds.findIndex((threshold) => userXp < threshold);

    if (newRankIndex !== -1) {
        // Normal rank advancement
        const newRank = rankingConfig.ranks[newRankIndex];
        const newRankImage = rankingConfig.images[newRankIndex];

        await update(userRef, {
            "profile/rankName": newRank,
            "profile/rankImage": newRankImage,
            "xp/level": newLevel,
            "xp/current": userXp - currentThreshold, // XP reset to the remaining amount after leveling up
        });

        // Show a level-up message
        Swal.fire({
            title: "Level Up!",
            text: rankingConfig.levelUpMessages[newRankIndex] || "You've leveled up!",
            icon: "success",
            confirmButtonText: "OK",
            customClass: {
                popup: "level-up-popup",
                title: "level-up-title",
                confirmButton: "level-up-confirm-button",
            },
        });
      
    } else {
        // User is at the highest rank ("Mythic")
        await update(userRef, {
            "profile/rankName": rankingConfig.ranks[rankingConfig.ranks.length - 1],
            "profile/rankImage": rankingConfig.images[rankingConfig.images.length - 1],
            "xp/level": currentLevel, // Keep the current level as the max
            "xp/current": userXp, // Continue accumulating XP indefinitely
        });
    }
  }

} 
});
        } 
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          navigate("/login");
        } else {
          fetchUserData(user.uid);
        }
      });
  
      return () => unsubscribe();
}, [navigate]);

   // Calculate XP percentage and threshold
   const calculateXpProgress = () => {
    const currentLevel = xpData.level - 1; // Levels start from 1, but thresholds are 0-indexed
    const currentThreshold = rankingConfig.thresholds[currentLevel] || 100;
    const xpPercentage = (xpData.current / currentThreshold) * 100;

    return { xpPercentage, currentThreshold};
  };

  const { xpPercentage, currentThreshold} = calculateXpProgress();

  
  

  
  
 
  // Group tasks by category
  const groupTasksByCategory = (tasks) => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    }, {});
  };
  const [openSections, setOpenSections] = useState({});
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [selectedBoost, setSelectedBoost] = useState(null);
  const groupedTasks = groupTasksByCategory(tasks);
// Initialize accordion sections when tasks load
useEffect(() => {
  const initialSections = Object.keys(groupedTasks).reduce((acc, category) => ({
    ...acc,
    [category]: category === "Task" // Only "Task" open by default
  }), {});
  setOpenSections(initialSections);
}, [tasks]);

const toggleSidebar = () => {
  setIsSidebarExpanded(!isSidebarExpanded);
};
// Toggle accordion sections
const toggleSection = (category) => {
  setOpenSections((prev) => ({
    ...prev,
    [category]: !prev[category],
  }));
};

// **NEW: Function to apply a boost to a selected task**
const applyBoost = async () => {
  if (!selectedTaskIndex || !selectedBoost) {
    Swal.fire({
      icon: "warning",
      title: "Select Task and Boost",
      text: "Please select a task and a boost to apply.",
      confirmButtonText: "OK",
    });
    return;
  }

  const task = tasks[selectedTaskIndex];
  if (task.boost) {
    Swal.fire({
      icon: "warning",
      title: "Boost Already Applied",
      text: `A boost (${task.boost}) is already applied to "${task.name}". Remove it first.`,
      confirmButtonText: "OK",
    });
    return;
  }

  const result = await Swal.fire({
    title: `Apply ${BOOSTS[selectedBoost].name}?`,
    text: BOOSTS[selectedBoost].description,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Apply",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    const updatedTasks = [...tasks];
    updatedTasks[selectedTaskIndex] = { ...task, boost: selectedBoost };

    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      tasks: updatedTasks,
    });

    setTasks(updatedTasks);
    setSelectedTaskIndex(null);
    setSelectedBoost(null);
  }
};

const removeBoost = async (taskIndex) => {
  const task = tasks[taskIndex];
  if (!task.boost) {
    Swal.fire({
      icon: "warning",
      title: "No Boost Applied",
      text: `No boost is applied to "${task.name}".`,
      confirmButtonText: "OK",
    });
    return;
  }

  const result = await Swal.fire({
    title: "Remove Boost?",
    text: `Are you sure you want to remove the ${BOOSTS[task.boost].name} from "${task.name}"?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Remove",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = { ...task, boost: null };

    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      tasks: updatedTasks,
    });

    setTasks(updatedTasks);
  }
};

  
  const completeTask = async (index) => {
    const task = tasks[index];
  
    // Ensure completionCount is a valid number
    if (typeof task.completionCount !== "number" || isNaN(task.completionCount)) {
      task.completionCount = 0; // Initialize to 0 if invalid
    }
  
    // Check if the task has reached its completion limit
    if (task.completionCount >= task.numberLimit) {
      Swal.fire({
        icon: "warning",
        title: "Task Limit Reached",
        text: `You have completed "${task.name}" the maximum number of times.`,
        confirmButtonText: "OK",
      });
      return;
    }
  
    // Increment completionCount
    const updatedTask = { ...task, completionCount: task.completionCount + 1 };
  
    // Update the tasks list
    const newTasks = [...tasks];
    newTasks[index] = updatedTask;
  
    // Add the task to completedTasks (only if it's not already there)
    const existingCompletedTaskIndex = completedTasks.findIndex((t) => t.name === task.name);
    let newCompletedTasks = [...completedTasks];
  
    if (existingCompletedTaskIndex === -1) {
      // Task is not in completedTasks, add it with a count of 1
      newCompletedTasks.push({ ...task, completionCount: 1 });
    } else {
      // Task is already in completedTasks, increment its completionCount
      const existingTask = newCompletedTasks[existingCompletedTaskIndex];
      newCompletedTasks[existingCompletedTaskIndex] = {
        ...existingTask,
        completionCount: existingTask.completionCount + 1,
        
      };
    }
    // Calculate bonuses if completionLimit is reached
    let bonusPoints = 0;
    let bonusXp = 0;
    let baseXp = task.xp;
    let basePoints = task.points;

    if (updatedTask.boost) {
      const boost = BOOSTS[updatedTask.boost];
      if (boost.type === "all") {
        if (boost.multiplier) {
          baseXp *= boost.multiplier;
          basePoints *= boost.multiplier;
          if (updatedTask.completionCount === updatedTask.numberLimit) {
            bonusXp = BONUS_XP * boost.multiplier;
            bonusPoints = BONUS_POINTS * boost.multiplier;
          }
        } else if (boost.percentage) {
          baseXp *= (1 + boost.percentage);
          basePoints *= (1 + boost.percentage);
          if (updatedTask.completionCount === updatedTask.numberLimit) {
            bonusXp = BONUS_XP * (1 + boost.percentage);
            bonusPoints = BONUS_POINTS * (1 + boost.percentage);
          }
        }
      } else if (boost.type === "bonus" && updatedTask.completionCount === updatedTask.numberLimit) {
        bonusXp = BONUS_XP * boost.multiplier;
        bonusPoints = BONUS_POINTS * boost.multiplier;
      }
    }

    if (updatedTask.completionCount === updatedTask.numberLimit) {
      bonusPoints = BONUS_POINTS;
      bonusXp = BONUS_XP;

    if (bonusPoints > 0 || bonusXp > 0) {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            taskName: task.name,
            points: bonusPoints,
            xp: bonusXp,
            position: `task-${index}`,
          },
        ]);}
      // Show notification for bonus
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          taskName: task.name,
          points: bonusPoints,
          xp: bonusXp,
          position: `task-${index}`, // Unique identifier for positioning
        },
      ]);

      // Auto-remove notification after 3 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== Date.now()));
      }, 3000);
    }
  
    // Update XP, points, and Mpoints
    const newXpData = { ...xpData, current: xpData.current + task.xp + bonusXp };
    const newPointsData = { ...pointsData, current: pointsData.current + task.points + bonusPoints };
    const newMpointsData = { ...MpointsData, current: MpointsData.current + task.points + bonusPoints };
    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

  // **NEW: Update taskHistory for both frequency units**
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
      },{ onlyOnce: true });

    await update(userRef, {
      tasks: newTasks,
      completedTasks: newCompletedTasks,
      xp: newXpData,
      points: newPointsData,
      Mpoints: newMpointsData,
    });
  
    
  };



  const undoTask = async (index) => {
    const task = completedTasks[index];
  
    // Find the task in the tasks list
    const taskIndex = tasks.findIndex((t) => t.name === task.name);
    if (taskIndex !== -1) {
      const currentTask = tasks[taskIndex];
      
      // Ensure completionCount is a valid number and does not go below 0
      const updatedCompletionCount = Math.max(currentTask.completionCount -task.completionCount, 0);
      const updatedTask = { ...currentTask, completionCount: updatedCompletionCount };
      
      // Update the tasks list
      const newTasks = [...tasks];
      newTasks[taskIndex] = updatedTask;
      // Remove the task from completedTasks
      const newCompletedTasks = completedTasks.filter((_, i) => i !== index);
  
      // Update XP, points, and Mpoints
      const newXp = Math.max(xpData.current - (task.xp * task.completionCount), 0);
      const newPoints = Math.max(pointsData.current - (task.points * task.completionCount), 0);
      const newMpoints = Math.max(MpointsData.current - (task.points * task.completionCount), 0);
  
      const newXpData = { ...xpData, current: newXp };
      const newPointsData = { ...pointsData, current: newPoints };
      const newMpointsData = { ...MpointsData, current: newMpoints };
  
      // Update Firebase Realtime Database
      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        xp: newXpData,
        points: newPointsData,
        Mpoints: newMpointsData,
      });
    }
  };
  const resetTaskCompletionCount = async (index) => {
    const task = tasks[index];
  
    // Reset completionCount to 0
    const updatedTask = { ...task, completionCount: 0 };
  
    // Update the tasks list
    const newTasks = [...tasks];
    newTasks[index] = updatedTask;
  
    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      tasks: newTasks,
    });
  
    Swal.fire({
      icon: "success",
      title: "Task Reset",
      text: `"${task.name}" has been reset. You can now complete it again.`,
      confirmButtonText: "OK",
    });
  };
  const resetCompletedTasks = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    // Reset completionCount for all tasks to 0
    const updatedTasks = tasks.map((task) => ({
      ...task,
      completionCount: 0,
    }));
  
    // Clear the completedTasks array
    const newCompletedTasks = [];
  
    // Update Firebase Realtime Database
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      tasks: updatedTasks,
      completedTasks: newCompletedTasks,
    });
  
    // Show a success message
    Swal.fire({
      icon: "success",
      title: "Tasks Reset!",
      text: "All completed tasks have been reset.",
      confirmButtonText: "OK",
    });
  };

  // Reset points bar
  const resetPointsBar = () => {
    const newPointsData = { current: 0, total: 900 };

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      points: newPointsData,
    });

    Swal.fire({
      icon: "success",
      title: "Points Bar Reset!",
      text: "The points bar has been reset to 0.",
      confirmButtonText: "OK",
    });
  };

  // Reset monthly points bar
  const resetMonthlyPointsBar = () => {
    const newMpointsData = { current: 0, total: 3000 };

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      Mpoints: newMpointsData,
    });

    Swal.fire({
      icon: "success",
      title: "Monthly Points Bar Reset!",
      text: "The Monthly points bar has been reset to 0.",
      confirmButtonText: "OK",
    });
  };

   // Handle logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signup");
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
                  {isSidebarExpanded && <span className="sidebar-text">Home</span>}
                </Link>
              </li>
              <li className="mb-3 w-100">
                <Link to="/leaderboard" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
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
              <li className="sidebar-section mb-3">
                {isSidebarExpanded && <h6 className="sidebar-section-title">Settings</h6>}
                <ul className="list-unstyled">
                  <li className="mb-2 w-100">
                    <button
                      onClick={resetCompletedTasks}
                      className={`btn btn-link text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'} p-0`}
                    >
                      <i className="bi bi-arrow-repeat-fill sidebar-icon me-2"></i>
                      {isSidebarExpanded && <span className="sidebar-text">Reset Completed Tasks</span>}
                    </button>
                  </li>
                  <li className="mb-2 w-100">
                    <button
                      onClick={resetPointsBar}
                      className={`btn btn-link text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'} p-0`}
                    >
                      <i className="bi bi-bar-chart-fill sidebar-icon me-2"></i>
                      {isSidebarExpanded && <span className="sidebar-text">Reset Points Bar</span>}
                    </button>
                  </li>
                  <li className="mb-2 w-100">
                    <button
                      onClick={resetMonthlyPointsBar}
                      className={`btn btn-link text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'} p-0`}
                    >
                      <i className="bi bi-calendar-fill sidebar-icon me-2"></i>
                      {isSidebarExpanded && <span className="sidebar-text">Reset Monthly Points</span>}
                    </button>
                  </li>
                </ul>
              </li>
              <li className="mb-3 w-100">
                <button
                  onClick={handleLogout}
                  className={`btn btn-link text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'} p-0`}
                >
                  <i className="bi bi-box-arrow-right-fill sidebar-icon me-2"></i>
                  {isSidebarExpanded && <span className="sidebar-text">Logout</span>}
                </button>
              </li>
              <li className="mb-3">
                <div className="profile-avatar">
                  <Link to="/profile" ><img
                    src={userProfile.photo || "profile-images/default-profile.png"}
                    alt="Profile"
                    className="rounded-circle sidebar-profile-icon"
                  /></Link>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className={`col p-4 dashboard-content ${isSidebarExpanded ? 'expanded' : ''}`}>
          {/* Profile and Rank Section */}
          <div className="row mb-4">
            <div className="col-12 col-md-6 mb-3 mb-md-0">
              <div className="card dashboard-card shadow-sm">
                <div className="card-body text-center p-3">
                  <img
                    src={userProfile.photo}
                    alt="Profile"
                    className="rounded-circle mb-2"
                    style={{ width: "100px", height: "100px", objectFit: "cover" }}
                  />
                  <h4 className="card-title text-dark fw-bold mb-1">{userProfile.name}</h4>
                  <p className="text-muted small">User ID: {auth.currentUser?.uid?.slice(0, 8)}...</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card dashboard-card shadow-sm">
                <div className="card-body text-center p-3">
                  <h5 className="card-title text-primary mb-2">Your Rank</h5>
                  <img
                    src={userProfile.rankImage}
                    alt="Rank"
                    className="mb-2"
                    style={{ width: "60px", height: "60px", objectFit: "contain" }}
                  />
                  <h6 className="card-text text-dark fw-bold">{userProfile.rankName}</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="row mb-4">
            <div className="col-12 col-md-4 mb-3 mb-md-0">
              <div className="card dashboard-card shadow-sm">
                <div className="card-body p-3">
                  <h6 className="card-title text-primary mb-2">XP Progress</h6>
                  <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${xpPercentage}%`, transition: "width 0.3s ease-in-out" }}
                      aria-valuenow={xpPercentage}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <p className="card-text mt-2 text-dark small">{xpData.current}/{currentThreshold} XP</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4 mb-3 mb-md-0">
              <div className="card dashboard-card shadow-sm">
                <div className="card-body p-3">
                  <h6 className="card-title text-primary mb-2">Points Progress</h6>
                  <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: `${(pointsData.current / pointsData.total) * 100}%` }}
                      aria-valuenow={(pointsData.current / pointsData.total) * 100}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <p className="card-text mt-2 text-dark small">{pointsData.current} pts</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card dashboard-card shadow-sm">
                <div className="card-body p-3">
                  <h6 className="card-title text-primary mb-2">Monthly Points Progress</h6>
                  <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: `${(MpointsData.current / MpointsData.total) * 100}%` }}
                      aria-valuenow={(MpointsData.current / MpointsData.total) * 100}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <p className="card-text mt-2 text-dark small">{MpointsData.current} pts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Boost Options Section */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card dashboard-card shadow-sm">
                <div className="card-body p-3">
                  <h6 className="card-title text-primary mb-2">Boost Options (currently not working)</h6>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="taskSelect" className="form-label text-dark small">Select Task</label>
                      <select
                        id="taskSelect"
                        className="form-select form-select-sm"
                        value={selectedTaskIndex !== null ? selectedTaskIndex : ""}
                        onChange={(e) => setSelectedTaskIndex(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Choose a task...</option>
                        {tasks.map((task, index) => (
                          <option key={index} value={index}>
                            {task.name} ({task.xp} XP, {task.points} Points)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label htmlFor="boostSelect" className="form-label text-dark small">Select Boost</label>
                      <select
                        id="boostSelect"
                        className="form-select form-select-sm"
                        value={selectedBoost || ""}
                        onChange={(e) => setSelectedBoost(e.target.value)}
                        disabled={!selectedTaskIndex}
                      >
                        <option value="">Choose a boost...</option>
                        {Object.entries(BOOSTS).map(([boostType]) => (
                          <option key={boostType} value={boostType}>
                            {boostType.replace(/([A-Z])/g, ' $1').trim()} 
                            {tasks[selectedTaskIndex]?.boost === boostType && " (Applied)"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 text-end">
                      <button
                        onClick={applyBoost}
                        className="btn btn-primary btn-sm mt-2"
                        disabled={!selectedTaskIndex || !selectedBoost}
                      >
                        Apply Boost
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Task Sections with Boosts */}
          <div className="row">
            <div className="col-12 col-md-6 mb-3 mb-md-0">
              <div className="card dashboard-card shadow-sm h-100">
                <div className="card-body p-3">
                  <h6 className="card-title text-primary mb-2">Available Tasks</h6>
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
                                      className={`list-group-item d-flex justify-content-between align-items-center py-1 position-relative ${task.boost ? 'boosted-task' : ''}`}
                                      id={`task-${originalIndex}`}
                                    >
                                      <div>
                                        <span style={{ color: "#dc3545" }}>{task.name}</span>
                                        <br />
                                        <small className="text-muted">
                                          ({task.xp} XP, {task.points} Points) | 
                                          Completed: {task.completionCount}/{task.numberLimit}
                                          {task.boost && (
                                            <span className="boost-badge ms-2">
                                              <i className="bi bi-lightning-fill" title={BOOSTS[task.boost].description}></i>
                                              <span className="boost-name">&nbsp;{BOOSTS[task.boost].name}</span>
                                            </span>
                                          )}
                                        </small>
                                      </div>
                                      <div>
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
                                        {task.boost && (
                                          <button
                                            onClick={() => removeBoost(originalIndex)}
                                            className="btn btn-danger btn-xs ms-1" 
                                          >
                                            Remove Boost
                                          </button>
                                        )}
                                      </div>
                                      {/* Render notifications for this task (bonus only) */}
                                      {notifications
                                        .filter((n) => n.position === `task-${originalIndex}`)
                                        .map((notification) => (
                                          <div
                                            key={notification.id}
                                            className="task-notification"
                                            style={{
                                              position: "absolute",
                                              top: "-20px",
                                              right: "0",
                                              fontSize: "12px",
                                              color: "#28a745",
                                              fontWeight: "bold",
                                              animation: "popUp 2s ease-out forwards",
                                            }}
                                          >
                                            {notification.points ? `+${notification.points}pts` : ""}
                                            {notification.xp ? ` +${notification.xp}XP` : ""}
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
              <div className="card dashboard-card shadow-sm h-100">
                <div className="card-body p-3">
                  <h6 className="card-title text-primary mb-2">Today's Completed Tasks</h6>
                  <ul className="list-group list-group-flush">
                    {completedTasks.map((task, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-1">
                        <span>
                          <span className="fw-bold text-dark">{task.completionCount}x</span> {task.name}
                        </span>
                        <button onClick={() => undoTask(index)} className="btn btn-danger btn-sm">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;