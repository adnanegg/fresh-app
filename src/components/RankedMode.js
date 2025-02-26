import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import Swal from "sweetalert2";
// import "./styles/RankedMode.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Ranking configuration
const rankingConfig = {
  thresholds: [50000, 200000, 1000000, 2000000, 40000000],
  ranks: ["Warrior", "Master", "Grand Master", "Legend", "Mythic"],
  images: [
    "../ranking-images/rank-warrior.png",
    "../ranking-images/rank-master.png",
    "../ranking-images/rank-grandmaster.png",
    "../ranking-images/rank-legend.png",
    "../ranking-images/rank-mythic.png",
  ],
  levelUpMessages: [
    "Warrior status unlocked! Your journey blazes with strength and courage!",
    "You did it! As a Master, your name now sparks awe and respect!",
    "Grand Master achieved! You wield power and wisdom like a true champion!",
    "Legend mode: activated! Your deeds are etched into the chronicles of greatness!",
    "Mythic rank reached! You've become a living legend—an icon of the ages!"
  ],
};

const BOOSTS = {
  "5xBonus": { multiplier: 5, type: "bonus", description: "Multiplies XP by 5" },
  "DoubleEverything": { multiplier: 2, type: "all", description: "Doubles XP for this task" },
  "+30Percent": { percentage: 0.3, type: "all", description: "Increases XP by 30% for this task" },
};

// Example ranked task level data (hardcoded in RankedMode.js for flexibility)
const TASK_LEVELS = {
  "book_read": { // Stable identifier for ranked task
    1: { name: "Book : Read 5 pages", xp: 600, requiredCompletionsForNextLevel: 20 },
    2: { name: "Book : Read 10 pages", xp: 1500, requiredCompletionsForNextLevel: 50 },
    3: { name: "Book : Read 25 pages", xp: 3000, requiredCompletionsForNextLevel: Infinity }, // Max level
  },
  "quran_read": {
    1: { name: "Quran : Read nissf hizb", xp: 700, requiredCompletionsForNextLevel: 50 },
    2: { name: "Quran : Read 1 hizb", xp: 1800, requiredCompletionsForNextLevel: 80 },
    3: { name: "Quran : Read 3 hizb", xp: 3500, requiredCompletionsForNextLevel: Infinity },
  },
  "sport_exercise": {
    1: { name: "Sport : Exercice for 20 min", xp: 550, requiredCompletionsForNextLevel: 15 },
    2: { name: "Intense Sport : Exercice for 45 min", xp: 1600, requiredCompletionsForNextLevel: 25 },
    3: { name: "Elite Athletics : Exercice for +1h30min", xp: 2500, requiredCompletionsForNextLevel: Infinity },
  },
  "prayer_mosque": {
    1: { name: "Prayer At The Mosque once daily", xp: 1000, requiredCompletionsForNextLevel: 25 },
    2: { name: "Prayer at Mosque two times daily", xp: 2500, requiredCompletionsForNextLevel: 40 },
    3: { name: "Prayer at The mosque 3 times daily", xp: 4000, requiredCompletionsForNextLevel: Infinity },
  },
  "improvement": {
    1: { name: "45 Min Improvement", xp: 900, requiredCompletionsForNextLevel: 20 },
    2: { name: " 1h30min Min Improvement", xp: 2200, requiredCompletionsForNextLevel: 45 },
    3: { name: " 3h Mastery", xp: 3200, requiredCompletionsForNextLevel: Infinity },
  },
  "Wake_up_early":{
    1: {name: "Wake up between Fajr athan and 1h after", xp:800,requiredCompletionsForNextLevel:20},
    2: {name:"Wake up 45min before Fajr athan",xp : 2000, requiredCompletionsForNextLevel: Infinity},
    3: {name : "Wake up 1h30min before Fajr athan"}
  },
  "listen_to_quoran":{
    1: {name : "Listen to 20 min of quoran", xp:600,requiredCompletionsForNextLevel: 20},
    2: {name : "Listen to a sura between 1-10 7izb", xp:1500,requiredCompletionsForNextLevel: 40 },
    3: {name : "Listen to surat al baqara or 5 a7sab", xp : 2500,requiredCompletionsForNextLevel : Infinity}
  }
  // Add more ranked tasks with stable IDs as needed
};

const RankedMode = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "../profile-images/default-profile.png",
    rankName: "Warrior",
    rankImage: "../ranking-images/rank-warrior.png"
  });
  const [rankedTasks, setRankedTasks] = useState([]); // State for ranked tasks
  const [xpData, setXpData] = useState({ current: 0, level: 1 });
  const [notifications, setNotifications] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [selectedBoost, setSelectedBoost] = useState(null);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);

  useEffect(() => {
    const fetchUserData = async (userId) => {
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserProfile(data.profile || { name: "User", photo: "../profile-images/default-profile.png" });
          const fetchedRankedTasks = data.rankedTasks || []; // Fetch rankedTasks from Firebase
          // Convert fetchedRankedTasks to an array if it's an object
          const rankedTasksArray = Array.isArray(fetchedRankedTasks) 
            ? fetchedRankedTasks 
            : Object.values(fetchedRankedTasks || {});
          // Ensure each ranked task has a taskId, level data, and defaults
          const updatedRankedTasks = rankedTasksArray.map(task => {
            // Safeguard for missing name property
            const taskName = task.name || "Unnamed Task"; // Default name if missing
            return {
              ...task,
              taskId: task.taskId || taskName.toLowerCase().replace(/ /g, '_').replace(/:/g, '_'), // Generate or use taskId, handle colons
              level: task.level || 1,
              maxLevel: task.maxLevel || 3,
              requiredCompletionsForNextLevel: TASK_LEVELS[task.taskId || taskName.toLowerCase().replace(/ /g, '_').replace(/:/g, '_')]?.[task.level || 1]?.requiredCompletionsForNextLevel || 1,
              completionCount: task.completionCount || 0,
              name: TASK_LEVELS[task.taskId || taskName.toLowerCase().replace(/ /g, '_').replace(/:/g, '_')]?.[task.level || 1]?.name || taskName, // Set name from level data or use task.name
            };
          });
          setRankedTasks(updatedRankedTasks); // Use rankedTasks state
          setXpData(data.xp || { current: 0, level: 1 });

          const userXp = data.xp?.current || 0;
          const currentLevel = data.xp?.level || 1;
          const currentThreshold = rankingConfig.thresholds[currentLevel - 1] || 100;

          if (userXp >= currentThreshold) {
            const newLevel = currentLevel + 1;
            const newRankIndex = rankingConfig.thresholds.findIndex((threshold) => userXp < threshold);

            if (newRankIndex !== -1) {
              const newRank = rankingConfig.ranks[newRankIndex];
              const newRankImage = rankingConfig.images[newRankIndex];

              await update(userRef, {
                "profile/rankName": newRank,
                "profile/rankImage": newRankImage,
                "xp/level": newLevel,
                "xp/current": userXp - currentThreshold,
              });

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
              await update(userRef, {
                "profile/rankName": rankingConfig.ranks[rankingConfig.ranks.length - 1],
                "profile/rankImage": rankingConfig.images[rankingConfig.images.length - 1],
                "xp/level": currentLevel,
                "xp/current": userXp,
              });
            }
          }
        }
      });
    };

    const fetchLeaderboardData = () => {
      const usersRef = ref(database, "users");
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const usersArray = Object.entries(data).map(([uid, userData]) => ({
            uid,
            name: userData.profile?.name || "Anonymous",
            rankName: userData.profile?.rankName || "Warrior",
            rankIndex: rankingConfig.ranks.indexOf(userData.profile?.rankName || "Warrior"),
            xp: userData.xp?.current || 0,
            photo: userData.profile?.photo || "../profile-images/default-profile.png",
          }));

          usersArray.sort((a, b) => {
            if (b.rankIndex !== a.rankIndex) return b.rankIndex - a.rankIndex;
            if (b.xp !== a.xp) return b.xp - a.xp;
            return a.name.localeCompare(b.name);
          });

          setLeaderboardUsers(usersArray);
        }
      });
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        fetchUserData(user.uid);
        fetchLeaderboardData();
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const calculateXpProgress = () => {
    const currentLevel = xpData.level - 1;
    const currentThreshold = rankingConfig.thresholds[currentLevel] || 100;
    const xpPercentage = (xpData.current / currentThreshold) * 100;

    return { xpPercentage, currentThreshold };
  };

  const { xpPercentage, currentThreshold } = calculateXpProgress();

  const groupTasksByCategory = (tasks) => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    }, {});
  };

  const groupedTasks = groupTasksByCategory(rankedTasks); // Use rankedTasks instead of tasks

  useEffect(() => {
    const initialSections = Object.keys(groupedTasks).reduce((acc, category) => ({
      ...acc,
      [category]: category === "Task"
    }), {});
    setOpenSections(initialSections);
  }, [rankedTasks]); // Use rankedTasks instead of tasks

  const toggleSection = (category) => {
    setOpenSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

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

    const task = rankedTasks[selectedTaskIndex]; // Use rankedTasks instead of tasks
    if (task.boost) {
      Swal.fire({
        icon: "warning",
        title: "Boost Already Applied",
        text: `A boost (${task.boost}) is already applied to "${task.name || 'Unnamed Task'}". Remove it first.`,
        confirmButtonText: "OK",
      });
      return;
    }

    const result = await Swal.fire({
      title: `Apply ${selectedBoost}?`,
      text: BOOSTS[selectedBoost].description,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Apply",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      const updatedTasks = [...rankedTasks]; // Use rankedTasks instead of tasks
      updatedTasks[selectedTaskIndex] = { ...task, boost: selectedBoost };

      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}/rankedTasks`); // Update in rankedTasks
      await update(userRef, { rankedTasks: updatedTasks }); // Use object with path-value pair

      setRankedTasks([...updatedTasks]); // Use rankedTasks instead of tasks
      setSelectedTaskIndex(null);
      setSelectedBoost(null);
    }
  };

  const removeBoost = async (taskIndex) => {
    const task = rankedTasks[taskIndex]; // Use rankedTasks instead of tasks
    if (!task.boost) {
      Swal.fire({
        icon: "warning",
        title: "No Boost Applied",
        text: `No boost is applied to "${task.name || 'Unnamed Task'}".`,
        confirmButtonText: "OK",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Remove Boost?",
      text: `Are you sure you want to remove the ${task.boost} from "${task.name || 'Unnamed Task'}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      const updatedTasks = [...rankedTasks]; // Use rankedTasks instead of tasks
      updatedTasks[taskIndex] = { ...task, boost: null };

      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}/rankedTasks`); // Update in rankedTasks
      await update(userRef, { rankedTasks: updatedTasks }); // Use object with path-value pair

      setRankedTasks([...updatedTasks]); // Use rankedTasks instead of tasks
    }
  };

  const upgradeTask = async (index) => {
    const task = rankedTasks[index]; // Use rankedTasks instead of tasks
    const currentLevel = task.level || 1;
    const maxLevel = task.maxLevel || 3;
    if (currentLevel >= maxLevel) {
      Swal.fire({
        icon: "warning",
        title: "Max Level Reached",
        text: `This task, "${task.name || 'Unnamed Task'}", is already at its maximum level (${maxLevel}).`,
        confirmButtonText: "OK",
      });
      return;
    }

    const nextLevel = currentLevel + 1;
    const taskId = task.taskId || (task.name ? task.name.toLowerCase().replace(/ /g, '_').replace(/:/g, '_') : "unnamed_task"); // Fallback for missing name
    const nextLevelData = TASK_LEVELS[taskId]?.[nextLevel];

    if (!nextLevelData) {
      Swal.fire({
        icon: "error",
        title: "Upgrade Error",
        text: `No data available for the next level of "${task.name || 'Unnamed Task'}". Update TASK_LEVELS in RankedMode.js.`,
        confirmButtonText: "OK",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Upgrade Task?",
      text: `Get ready for greatness! This task, "${task.name || 'Unnamed Task'}", is being upgraded to "${nextLevelData.name}"!`,
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Upgrade",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      const updatedTask = {
        ...task,
        name: nextLevelData.name,
        xp: nextLevelData.xp,
        level: nextLevel,
        completionCount: 0, // Reset completions
        // Handle Infinity for max level by using a large finite number or omitting the property
        requiredCompletionsForNextLevel: nextLevelData.requiredCompletionsForNextLevel === Infinity ? 999999999 : nextLevelData.requiredCompletionsForNextLevel,
        maxLevel: maxLevel, // Preserve maxLevel
        taskId: taskId, // Preserve stable taskId
      };

      const newTasks = [...rankedTasks]; // Use rankedTasks instead of tasks
      newTasks[index] = updatedTask;

      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}/rankedTasks`); // Update in rankedTasks
      await update(userRef, { rankedTasks: newTasks }); // Use object with path-value pair

      // Force a re-render with the updated task data
      setRankedTasks([...newTasks]); // Use rankedTasks instead of tasks

      Swal.fire({
        icon: "success",
        title: "Task Upgraded!",
        text: `Congratulations! "${task.name || 'Unnamed Task'}" has evolved into "${nextLevelData.name}" with ${nextLevelData.xp} XP!`,
        confirmButtonText: "Awesome!",
      });
    }
  };

  const completeTask = async (index) => {
    const task = rankedTasks[index]; // Use rankedTasks instead of tasks

    if (typeof task.completionCount !== "number" || isNaN(task.completionCount)) {
      task.completionCount = 0;
    }

    const updatedTask = { ...task, completionCount: task.completionCount + 1 };
    const newTasks = [...rankedTasks]; // Use rankedTasks instead of tasks
    newTasks[index] = updatedTask;

    let effectiveXp = task.selectedMode === 'exceptional' ? (task.xp || 0) / 2 : task.xp || 0; // Fallback for missing xp

    if (task.boost) {
      const boost = BOOSTS[task.boost];
      if (boost.type === "all") {
        if (boost.multiplier) {
          effectiveXp *= boost.multiplier;
        } else if (boost.percentage) {
          effectiveXp *= (1 + boost.percentage);
        }
      } else if (boost.type === "bonus") {
        effectiveXp *= boost.multiplier;
      }
    }

    setNotifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        taskName: task.name || "Unnamed Task", // Fallback for missing name
        xp: effectiveXp,
        position: `task-${index}`,
      },
    ]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== Date.now()));
    }, 2000);

    const newXpData = { ...xpData, current: xpData.current + effectiveXp };

    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const taskHistoryRef = ref(database, `users/${userId}/rankedTaskHistory/${dateStr}`); // Use rankedTaskHistory for history
    onValue(taskHistoryRef, (snapshot) => {
      const history = snapshot.val() || {};
      let updatedHistory = { ...history };

      if (task.frequencyUnit === "days") {
        updatedHistory[task.name || "Unnamed Task"] = { completed: true }; // Fallback for missing name
      } else if (task.frequencyUnit === "times") {
        updatedHistory[task.name || "Unnamed Task"] = {
          completions: (history[task.name || "Unnamed Task"]?.completions || 0) + 1 // Fallback for missing name
        };
      }

      update(taskHistoryRef, updatedHistory);
    }, { onlyOnce: true });

    await update(userRef, {
      rankedTasks: newTasks, // Update rankedTasks in Firebase (already handled by individual updates above)
      xp: newXpData,
    });

    setRankedTasks([...newTasks]); // Use rankedTasks instead of tasks
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signup");
  };

  const styles = {
    containerFluid: { padding: 0, position: "relative" },
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
      padding: "10px",
    },
    dashboardCard: {
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    profileRankCard: {
      backgroundColor: "rgba(13, 53, 51, 0.3)", // Teal/Cyan (semi-transparent)
    },
    xpBarCard: {
      backgroundColor: "rgba(192, 192, 192, 0.3)", // Silver (semi-transparent)
    },
    boostCard: {
      backgroundColor: "rgba(205, 127, 50, 0.3)", // Bronze (semi-transparent)
    },
    tasksCard: {
      backgroundColor: "rgba(255, 215, 0, 0.3)", // Gold (semi-transparent)
    },
    leaderboard: {
      backgroundColor: "transparent", // Default transparent for leaderboard
      maxHeight: "100%",
      overflowY: "auto",
      border: "none",
    },
    progressBar: {
      height: "6px",
      borderRadius: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      marginRight: "10px",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: "4px",
      backgroundColor: "#28a745",
      transition: "width 0.3s ease-in-out",
    },
    upgradeButton: {
      backgroundColor: "#007bff",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "0.8rem",
      marginLeft: "5px",
      cursor: "pointer",
    },
  };

  // Animations for notifications
  const stylesString = `
    @keyframes popUp {
      0% { opacity: 0; transform: translateY(-10px); }
      50% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
  `;

  return (
    <div style={styles.containerFluid}>
      <style>{stylesString}</style>
      <video
        autoPlay
        loop
        muted
        className="video-background"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      >
        <source src="/videos/backvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 0,
        }}
      ></div>

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
              src={userProfile.photo || "../profile-images/default-profile.png"}
              alt="Profile"
              style={styles.sidebarProfileIcon}
              className="rounded-circle"
            />
          </Link>
        </div>
      </div>

      <div style={styles.dashboardContent}>
        <div className="row">
          {/* Left Column for Profile, Rank, and XP */}
          <div className="col-md-4 video-match-card">
            <div className="row mb-3 align-items-center">
              <div className="col-12">
                <div className="card dashboard-card profile-rank-card p-2">
                  <div className="row align-items-center">
                    <div className="col-auto">
                      <img
                        src={userProfile.photo}
                        alt="Profile"
                        className="rounded-circle"
                        style={{ width: "80px", height: "80px", objectFit: "cover" }} // Larger profile image
                      />
                    </div>
                    <div className="col">
                      <p className="text-center text-dark small mb-0">{userProfile.name}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 mt-2">
                <div className="card dashboard-card profile-rank-card p-2">
                  <div className="row align-items-center">
                    <div className="col-auto">
                      <img
                        src={userProfile.rankImage}
                        alt="Rank"
                        style={{ width: "80px", height: "80px", objectFit: "contain" }} // Larger rank image
                      />
                    </div>
                    <div className="col">
                      <p className="text-center text-dark small mb-0">{userProfile.rankName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="card dashboard-card xp-bar-card p-2">
                  <h6 className="card-title text-primary mb-2">XP Progress</h6>
                  <div className="progress" style={{ height: "6px", borderRadius: "4px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${xpPercentage}%`, transition: "width 0.3s ease-in-out" }}
                      aria-valuenow={xpPercentage}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <p className="card-text text-dark small mt-1 mb-0">{xpData.current}/{currentThreshold} XP</p>
                </div>
              </div>
            </div>

            {/* Boost Options */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="card dashboard-card boost-card p-2">
                  <h6 className="card-title text-primary mb-2">Boost Options</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <select
                        id="taskSelect"
                        className="form-select form-select-sm"
                        value={selectedTaskIndex !== null ? selectedTaskIndex : ""}
                        onChange={(e) => setSelectedTaskIndex(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Task...</option>
                        {rankedTasks.map((task, index) => ( // Use rankedTasks instead of tasks
                          <option key={index} value={index}>
                            {task.name || "Unnamed Task"} ({task.xp || 0} XP) {/* Fallback for missing name and xp */}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <select
                        id="boostSelect"
                        className="form-select form-select-sm"
                        value={selectedBoost || ""}
                        onChange={(e) => setSelectedBoost(e.target.value)}
                        disabled={!selectedTaskIndex}
                      >
                        <option value="">Boost...</option>
                        {Object.entries(BOOSTS).map(([boostType]) => (
                          <option key={boostType} value={boostType}>
                            {boostType.replace(/([A-Z])/g, ' $1').trim()}
                            {rankedTasks[selectedTaskIndex]?.boost === boostType && " (Applied)"} {/* Use rankedTasks */}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 text-end">
                      <button
                        onClick={applyBoost}
                        className="btn btn-primary btn-sm w-100"
                        disabled={!selectedTaskIndex || !selectedBoost}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Column (Full Height, Expanded) */}
          <div className="col-md-4 d-flex flex-column justify-content-center">
            <div className="card dashboard-card leaderboard p-2 w-100" style={{ flex: 1, minHeight: "500px" }}>
              <h6 className="text-primary text-center mb-2">Leaderboard</h6>
              <table className="table table-striped table-bordered" style={{ height: "100%" }}>
                <thead style={{ backgroundColor: "#007bff", color: "#fff" }}>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Rank</th>
                    <th>XP</th>
                  </tr>
                </thead>
                <tbody style={{ overflowY: "auto", maxHeight: "calc(100% - 40px)" }}>
                  {leaderboardUsers.map((user, index) => (
                    <tr key={user.uid} className={index < 3 ? `leaderboard-rank-${index + 1}` : "leaderboard-default"}>
                      <td>{index + 1}</td>
                      <td>
                        <img
                          src={user.photo}
                          alt={`${user.name}'s profile`}
                          className="rounded-circle me-2"
                          style={{ width: "30px", height: "30px", objectFit: "cover" }}
                        />
                        {user.name}
                      </td>
                      <td>{user.rankName}</td>
                      <td>{user.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tasks Section (Smaller Width) */}
          <div className="col-md-4 video-match-card">
            <div className="card dashboard-card tasks-card p-2">
              <h6 className="card-title text-primary mb-2">Available Ranked Tasks</h6> {/* Updated label */}
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
                      <div className="accordion-body p-1">
                        {categoryTasks.length > 0 ? (
                          <ul className="list-group list-group-flush">
                            {categoryTasks.map((task, taskIndex) => {
                              const originalIndex = rankedTasks.findIndex(t => t.taskId === task.taskId || (t.name && t.name === task.name)); // Use rankedTasks, check for name
                              const currentLevel = task.level || 1;
                              const maxLevel = task.maxLevel || 3;
                              const taskId = task.taskId || (task.name ? task.name.toLowerCase().replace(/ /g, '_').replace(/:/g, '_') : "unnamed_task"); // Fallback for missing name
                              const levelData = TASK_LEVELS[taskId]?.[currentLevel] || { xp: task.xp || 0, requiredCompletionsForNextLevel: 1, name: task.name || "Unnamed Task" };
                              const progress = (task.completionCount || 0) / (levelData.requiredCompletionsForNextLevel || 1); // Ensure denominator is not zero, handle missing completionCount
                              const canUpgrade = progress >= 1 && currentLevel < maxLevel;

                              return (
                                <li
                                  key={taskIndex}
                                  className={`list-group-item d-flex justify-content-between align-items-center py-1 position-relative ${task.boost ? 'boosted-task' : ''}`}
                                  id={`task-${originalIndex}`}
                                >
                                  <div>
                                    <span style={{ color: "#dc3545" }}>{task.name || "Unnamed Task"}</span>
                                    <br />
                                    <small className="text-muted">
                                      ({task.xp || 0} XP) | Completions: {task.completionCount || 0}
                                      {task.boost && (
                                        <span className="boost-badge ms-2">
                                          <i className="bi bi-lightning-fill" title={BOOSTS[task.boost].description}></i>
                                          <span className="boost-name"> {BOOSTS[task.boost].name}</span>
                                        </span>
                                      )}
                                    </small>
                                    {levelData.requiredCompletionsForNextLevel < Infinity && (
                                      <div className="d-flex align-items-center mt-1">
                                        <div style={styles.progressBar} className="flex-grow-1">
                                          <div
                                            style={{
                                              ...styles.progressBarFill,
                                              width: `${Math.min(progress, 1) * 100}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="ms-2 text-dark small">
                                          {task.completionCount || 0}/{levelData.requiredCompletionsForNextLevel}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => completeTask(originalIndex)}
                                      className="btn btn-plus"
                                    >
                                      <i className="bi bi-plus-lg"></i>
                                    </button>
                                    {task.boost && (
                                      <button
                                        onClick={() => removeBoost(originalIndex)}
                                        className="btn btn-danger btn-xs ms-1"
                                      >
                                        Remove
                                      </button>
                                    )}
                                    {canUpgrade && (
                                      <button
                                        onClick={() => upgradeTask(originalIndex)}
                                        style={styles.upgradeButton}
                                        className="ms-1"
                                      >
                                        Upgrade
                                      </button>
                                    )}
                                  </div>
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
                                        {notification.xp ? `+${notification.xp} XP` : ""}
                                      </div>
                                    ))}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-muted small">No ranked tasks in this category</p> 
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankedMode;