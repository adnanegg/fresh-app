import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate,Link } from "react-router-dom";
import { ref, onValue, update,get,child } from "firebase/database";
import Swal from "sweetalert2";
import "./styles/Dashboard.css";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "bootstrap-icons/font/bootstrap-icons.css"; // Import Bootstrap Icons (optional)

// Ranking configuration
const rankingConfig = {
  thresholds: [100, 200, 300, 400, 500], // XP thresholds for each rank
  ranks: ["Warrior", "Master", "Grand Master", "Legend", "Mythic"], // Rank names
  images: [
    "ranking-images/rank-warrior.png",
    "ranking-images/rank-master.png",
    "ranking-images/rank-grandmaster.png",
    "ranking-images/rank-legend.png",
    "ranking-images/rank-mythic.png",
  ],
  levelUpMessages: [
    "Congratulations! You've reached the rank of Warrior!",
    "Amazing! You're now a Master!",
    "Incredible! You've become a Champion!",
    "Unstoppable! You're now a Legend!",
    "Legendary! You've achieved the rank of Mythic!",
  ], // Rank images
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
  const [pointsData, setPointsData] = useState({ current: 0, total: 1000 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 3000 });

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
            setPointsData(data.points || { current: 0, total: 1000 });
            setMpointsData(data.Mpoints || { current: 0, total: 3000 });

            // Update rank based on XP
          const userXp = data.xp?.current || 0;
          const newRankIndex = rankingConfig.thresholds.findIndex((threshold) => userXp < threshold);
          const newRank = newRankIndex === -1 ? rankingConfig.ranks[rankingConfig.ranks.length - 1] : rankingConfig.ranks[newRankIndex];
          const newRankImage = newRankIndex === -1 ? rankingConfig.images[rankingConfig.images.length - 1] : rankingConfig.images[newRankIndex];

          if (newRank !== data.profile?.rankName) {


            update(userRef, {
              "profile/rankName": newRank,
              "profile/rankImage": newRankImage,
              
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
          }
        }
      });  
    };
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          navigate("/login");
        } else {
          fetchUserData(user.uid);
        }
      });
  
      return () => unsubscribe();
    }, [navigate]);


  // Calculate XP percentage
  const xpThreshold = rankingConfig.thresholds[xpData.level - 1] || 100;
  const xpPercentage = (xpData.current / xpThreshold) * 100;
  
  const updateXp = async (xpToAdd) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const userRef = ref(database, `users/${userId}`);
    const dbRef = ref(database);
  
    try {
      // Fetch the current user data
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();
  
      if (!userData) return;
  
      // Fetch XP thresholds from the database
      const xpSnapshot = await get(child(dbRef, 'xpthresholds'));
      if (!xpSnapshot.exists()) return;
  
      const thresholds = xpSnapshot.val();
      const sortedThresholds = Object.entries(thresholds).sort((a, b) => a[1] - b[1]);
  
      // Calculate new XP
      const newXp = userData.xp.current + xpToAdd;
      let newLevel = userData.xp.level;
      let newRank = userData.profile.rankName;
      let newRankImage = userData.profile.rankImage;
  
      // Check if the user has leveled up
      for (const [rankName, xpThreshold] of sortedThresholds) {
        if (newXp >= xpThreshold) {
          newLevel = xpThreshold;
          newRank = rankName;
          newRankImage = `ranking-images/rank-${rankName.toLowerCase()}.png`;
        }
      }
  
      // Update the user's XP, level, rank, and rank image in the database
      await update(userRef, {
        "xp/current": newXp,
        "xp/level": newLevel,
        "profile/rankName": newRank,
        "profile/rankImage": newRankImage,
      });
  
      // Optionally, you can show a notification or alert for leveling up
      if (newRank !== userData.profile.rankName) {
        Swal.fire({
          icon: "success",
          title: "Level Up!",
          text: `You have reached the rank of ${newRank}!`,
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
      });
    }
  };
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
  const [openSections, setOpenSections] = useState({
    Task: true, // Open the "Task" section by default
    Bonus: false,
  });
// Toggle accordion sections
const toggleSection = (category) => {
  setOpenSections((prev) => ({
    ...prev,
    [category]: !prev[category],
  }));
};

  const groupedTasks = groupTasksByCategory(tasks);

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
  
    // Update XP, points, and Mpoints
    const newXpData = { ...xpData, current: xpData.current + task.xp };
    const newPointsData = { ...pointsData, current: pointsData.current + task.points };
    const newMpointsData = { ...MpointsData, current: MpointsData.current + task.points };
  
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
  
    // Call updateXp to handle XP and rank updates
    await updateXp(task.xp);
  };



  const undoTask = async (index) => {
    const task = completedTasks[index];
  
    // Find the task in the tasks list
    const taskIndex = tasks.findIndex((t) => t.name === task.name);
    if (taskIndex !== -1) {
      const currentTask = tasks[taskIndex];
  
      // Ensure completionCount is a valid number and does not go below 0
      const updatedCompletionCount = Math.max(currentTask.completionCount - 1, 0);
      const updatedTask = { ...currentTask, completionCount: updatedCompletionCount };
  
      // Update the tasks list
      const newTasks = [...tasks];
      newTasks[taskIndex] = updatedTask;
  
      // Remove the task from completedTasks
      const newCompletedTasks = completedTasks.filter((_, i) => i !== index);
  
      // Update XP, points, and Mpoints
      const newXp = Math.max(xpData.current - task.xp, 0);
      const newPoints = Math.max(pointsData.current - task.points, 0);
      const newMpoints = Math.max(MpointsData.current - task.points, 0);
  
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
    const newPointsData = { current: 0, total: 1000 };

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
        <div className="col-md-3 bg-light p-4 vh-100 shadow">
          <h2 className="mb-4">Menu</h2>
          <ul className="list-unstyled">
            <li className="mb-3">
              <a href="/dashboard" className="text-decoration-none text-dark d-flex align-items-center">
                <i className="bi bi-house me-2"></i> Home
              </a>
            </li>
            <li className="mb-3">
              <p className="text-decoration-none text-dark d-flex align-items-center">
                <i className="bi bi-person me-2"></i><Link to="/profile">Profile</Link>
              </p>
            </li>
            <li className="mb-3">
              <a href="/badges" className="text-decoration-none text-dark d-flex align-items-center">
                <i className="bi bi-award me-2"></i> Badges
              </a>
            </li>
            <li className="mb-3">
              <button onClick={resetCompletedTasks} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
                <i className="bi bi-arrow-repeat me-2"></i> Reset Completed Tasks
              </button>
            </li>
            <li className="mb-3">
              <button onClick={resetPointsBar} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
                <i className="bi bi-bar-chart me-2"></i> Reset Points Bar
              </button>
            </li>
            <li className="mb-3">
              <button onClick={resetMonthlyPointsBar} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
                <i className="bi bi-calendar me-2"></i> Reset Monthly Points
              </button>
            </li>
            <li className="mb-3">
              <button onClick={handleLogout} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
                <i className="bi bi-box-arrow-right me-2"></i> Logout
              </button>
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="col-md-9 p-4">
          {/* Profile and Rank Section */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card text-center p-4">
                <img src={userProfile.photo} alt="Profile" className="rounded-circle mx-auto mb-3" width="100" height="100" />
                <h3 className="golden-3d">{userProfile.name}</h3>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card text-center p-4">
                <h2 className="bronze-3d mb-3">Your Rank</h2>
                <img src={userProfile.rankImage} alt="Rank" className="mx-auto mb-3" width="80" height="80" />
                <p className="bronze-3d">{userProfile.rankName}</p>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card p-3">
                <h4>XP Progress</h4>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${xpPercentage}%`,
                      transition: "width 0.5s ease-in-out",
                      backgroundColor: xpPercentage >= 75 ? "green" : xpPercentage >= 50 ? "yellow" : "blue",
                    }}
                  ></div>
                </div>
                <span className="mt-2">{xpData.current}/{xpThreshold} XP</span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card p-3">
                <h4>Points Progress</h4>
                <div className="progress">
                  <div
                    className="progress-bar bg-warning"
                    style={{ width: `${(pointsData.current / pointsData.total) * 100}%` }}
                  ></div>
                </div>
                <span className="mt-2">{pointsData.current} pts</span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card p-3">
                <h4>Monthly Points Progress</h4>
                <div className="progress">
                  <div
                    className="progress-bar bg-danger"
                    style={{ width: `${(MpointsData.current / MpointsData.total) * 100}%` }}
                  ></div>
                </div>
                <span className="mt-2">{MpointsData.current} pts</span>
              </div>
            </div>
          </div>

          {/* Task Sections */}
          <div className="row">
            {/* Daily Tasks */}
            <div className="col-md-6">
              <div className="card p-4">
                <h4>Daily Tasks</h4>
                <div className="accordion">
                  {Object.entries(groupedTasks).map(([category, tasks]) => (
                    <div className="accordion-item" key={category}>
                      <h2 className="accordion-header">
                        <button
                          className="accordion-button"
                          type="button"
                          onClick={() => toggleSection(category)}
                          aria-expanded={openSections[category]}
                        >
                          {category} Tasks
                        </button>
                      </h2>
                      <div
                        className={`accordion-collapse ${openSections[category] ? "show" : "collapse"}`}
                      >
                        <div className="accordion-body">
                          <ul className="list-group">
                            {tasks.map((task, taskIndex) => (
                              <li key={taskIndex} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>
                                  <span style={{ color: "brown" }}>{task.name}</span> ({task.xp} XP, {task.points} Points)
                                  <br />
                                  <small>Completed: {task.completionCount}/{task.numberLimit}</small>
                                </span>
                                <div>
                                  <button
                                    onClick={() => completeTask(taskIndex)}
                                    className="btn btn-success btn-sm me-2"
                                    disabled={task.completionCount >= task.numberLimit}
                                  >
                                    Complete
                                  </button>
                                  <button
                                    onClick={() => resetTaskCompletionCount(taskIndex)}
                                    className="btn btn-warning btn-sm"
                                  >
                                    Reset
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="col-md-6">
              <div className="card p-4">
                <h4>Today's Completed Tasks</h4>
                <ul className="list-group">
                  {completedTasks.map((task, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>
                        <span style={{ fontWeight: "bold" }}>{task.completionCount}</span> {task.name}
                      </span>
                      <button onClick={() => undoTask(index)} className="btn btn-danger btn-sm">
                        Undo
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard