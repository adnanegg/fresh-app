import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import Swal from "sweetalert2";

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

// Example ranked task level data
const TASK_LEVELS = {
  "book_read": {
    1: { name: "Book : Read 5 pages", xp: 600, requiredCompletionsForNextLevel: 20 },
    2: { name: "Book : Read 10 pages", xp: 1500, requiredCompletionsForNextLevel: 50 },
    3: { name: "Book : Read 25 pages", xp: 3000, requiredCompletionsForNextLevel: 999999999 },
  },
  "quran_read": {
    1: { name: "Quran : Read nissf hizb", xp: 700, requiredCompletionsForNextLevel: 50 },
    2: { name: "Quran : Read 1 hizb", xp: 1800, requiredCompletionsForNextLevel: 80 },
    3: { name: "Quran : Read 3 hizb", xp: 3500, requiredCompletionsForNextLevel: 999999999 },
  },
  "sport_exercise": {
    1: { name: "Sport : Exercice for 20 min", xp: 550, requiredCompletionsForNextLevel: 15 },
    2: { name: "Intense Sport : Exercice for 45 min", xp: 1600, requiredCompletionsForNextLevel: 25 },
    3: { name: "Elite Athletics : Exercice for +1h30min", xp: 2500, requiredCompletionsForNextLevel: 999999999 },
  },
  "prayer_mosque": {
    1: { name: "Prayer At The Mosque once daily", xp: 1000, requiredCompletionsForNextLevel: 25 },
    2: { name: "Prayer at Mosque two times daily", xp: 2500, requiredCompletionsForNextLevel: 40 },
    3: { name: "Prayer at The mosque 3 times daily", xp: 4000, requiredCompletionsForNextLevel: 999999999 },
  },
  "improvement": {
    1: { name: "45 Min Improvement", xp: 900, requiredCompletionsForNextLevel: 20 },
    2: { name: "1h30min Min Improvement", xp: 2200, requiredCompletionsForNextLevel: 45 },
    3: { name: "3h Mastery", xp: 3200, requiredCompletionsForNextLevel: 999999999 },
  },
  "Wake_up_early": {
    1: { name: "Wake up between Fajr athan and 1h after", xp: 800, requiredCompletionsForNextLevel: 20 },
    2: { name: "Wake up 45min before Fajr athan", xp: 2000, requiredCompletionsForNextLevel: 50 },
    3: { name: "Wake up 1h30min before Fajr athan", xp: 3000, requiredCompletionsForNextLevel: 999999999 },
  },
  "listen_to_quoran": {
    1: { name: "Listen to 20 min of quoran", xp: 600, requiredCompletionsForNextLevel: 20 },
    2: { name: "Listen to a sura between 1-10 7izb", xp: 1500, requiredCompletionsForNextLevel: 40 },
    3: { name: "Listen to surat al baqara or 5 a7sab", xp: 2500, requiredCompletionsForNextLevel: 999999999 },
  },
};

// Example store items (placeholder for testing)
const STORE_ITEMS = {
  "item1": { name: "XP Boost (2x)", cost: 200, effect: "Doubles XP for 1 task" },
  "item2": { name: "Coin Pack (500)", cost: 100, effect: "Adds 500 coins" },
  "item3": { name: "Task Unlock", cost: 300, effect: "Unlocks a new task" },
};

// Example quest data (placeholder for testing)
const QUESTS = {
  "quest1": { name: "Complete 5 Tasks", reward: 100, completed: false },
  "quest2": { name: "Earn 1000 XP", reward: 250, completed: false },
  "quest3": { name: "Upgrade a Task", reward: 500, completed: false },
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
  const [coins, setCoins] = useState(2000); // Placeholder for coins
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [storeItems, setStoreItems] = useState(STORE_ITEMS);
  const [quests, setQuests] = useState(QUESTS);

  useEffect(() => {
    const fetchUserData = async (userId) => {
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserProfile(data.profile || { name: "User", photo: "../profile-images/default-profile.png" });
          const fetchedRankedTasks = data.rankedTasks || [];
          const rankedTasksArray = Array.isArray(fetchedRankedTasks) 
            ? fetchedRankedTasks 
            : Object.values(fetchedRankedTasks || {});
          const updatedRankedTasks = rankedTasksArray.map(task => {
            const taskName = task.name || "Unnamed Task";
            return {
              ...task,
              taskId: task.taskId || taskName.toLowerCase().replace(/ /g, '_').replace(/:/g, '_'),
              level: task.level || 1,
              maxLevel: task.maxLevel || 3,
              requiredCompletionsForNextLevel: TASK_LEVELS[task.taskId || taskName.toLowerCase().replace(/ /g, '_').replace(/:/g, '_')]?.[task.level || 1]?.requiredCompletionsForNextLevel || 1,
              completionCount: task.completionCount || 0,
              name: TASK_LEVELS[task.taskId || taskName.toLowerCase().replace(/ /g, '_').replace(/:/g, '_')]?.[task.level || 1]?.name || taskName,
            };
          });
          setRankedTasks(updatedRankedTasks);
          setXpData(data.xp || { current: 0, level: 1 });
          setCoins(data.coins || 2000);

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

  const groupedTasks = groupTasksByCategory(rankedTasks);

  useEffect(() => {
    const initialSections = Object.keys(groupedTasks).reduce((acc, category) => ({
      ...acc,
      [category]: category === "Task"
    }), {});
    setOpenSections(initialSections);
  }, [rankedTasks]);

  const toggleSection = (category) => {
    setOpenSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleStore = () => {
    setIsStoreOpen(!isStoreOpen);
    if (isQuestsOpen) setIsQuestsOpen(false); // Close quests if opening store
  };

  const toggleQuests = () => {
    setIsQuestsOpen(!isQuestsOpen);
    if (isStoreOpen) setIsStoreOpen(false); // Close store if opening quests
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

    const task = rankedTasks[selectedTaskIndex];
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
      const updatedTasks = [...rankedTasks];
      updatedTasks[selectedTaskIndex] = { ...task, boost: selectedBoost };

      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}/rankedTasks`);
      await update(userRef, { rankedTasks: updatedTasks });

      setRankedTasks([...updatedTasks]);
      setSelectedTaskIndex(null);
      setSelectedBoost(null);
    }
  };

  const removeBoost = async (taskIndex) => {
    const task = rankedTasks[taskIndex];
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
      const updatedTasks = [...rankedTasks];
      updatedTasks[taskIndex] = { ...task, boost: null };

      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}/rankedTasks`);
      await update(userRef, { rankedTasks: updatedTasks });

      setRankedTasks([...updatedTasks]);
    }
  };

  const upgradeTask = async (index) => {
    const task = rankedTasks[index];
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
    const taskId = task.taskId || (task.name ? task.name.toLowerCase().replace(/ /g, '_').replace(/:/g, '_') : "unnamed_task");
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
        completionCount: 0,
        requiredCompletionsForNextLevel: nextLevelData.requiredCompletionsForNextLevel === Infinity ? 999999999 : nextLevelData.requiredCompletionsForNextLevel,
        maxLevel: maxLevel,
        taskId: taskId,
      };

      const newTasks = [...rankedTasks];
      newTasks[index] = updatedTask;

      const userId = auth.currentUser?.uid;
      const userRef = ref(database, `users/${userId}/rankedTasks`);
      await update(userRef, { rankedTasks: newTasks });

      setRankedTasks([...newTasks]);

      Swal.fire({
        icon: "success",
        title: "Task Upgraded!",
        text: `Congratulations! "${task.name || 'Unnamed Task'}" has evolved into "${nextLevelData.name}" with ${nextLevelData.xp} XP!`,
        confirmButtonText: "Awesome!",
      });
    }
  };

  const completeTask = async (index) => {
    const task = rankedTasks[index];

    if (typeof task.completionCount !== "number" || isNaN(task.completionCount)) {
      task.completionCount = 0;
    }

    const updatedTask = { ...task, completionCount: task.completionCount + 1 };
    const newTasks = [...rankedTasks];
    newTasks[index] = updatedTask;

    let effectiveXp = task.selectedMode === 'exceptional' ? (task.xp || 0) / 2 : task.xp || 0;

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
        taskName: task.name || "Unnamed Task",
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

    const taskHistoryRef = ref(database, `users/${userId}/rankedTaskHistory/${dateStr}`);
    onValue(taskHistoryRef, (snapshot) => {
      const history = snapshot.val() || {};
      let updatedHistory = { ...history };

      if (task.frequencyUnit === "days") {
        updatedHistory[task.name || "Unnamed Task"] = { completed: true };
      } else if (task.frequencyUnit === "times") {
        updatedHistory[task.name || "Unnamed Task"] = {
          completions: (history[task.name || "Unnamed Task"]?.completions || 0) + 1
        };
      }

      update(taskHistoryRef, updatedHistory);
    }, { onlyOnce: true });

    await update(userRef, {
      rankedTasks: newTasks,
      xp: newXpData,
    });

    setRankedTasks([...newTasks]);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signup");
  };

  const buyItem = (itemId) => {
    const item = storeItems[itemId];
    if (coins >= item.cost) {
      setCoins(coins - item.cost);
      Swal.fire({
        icon: "success",
        title: "Purchase Successful!",
        text: `You bought ${item.name}! ${item.effect}`,
        confirmButtonText: "OK",
      });
      // Add logic for item effects here (e.g., apply XP boost)
    } else {
      Swal.fire({
        icon: "warning",
        title: "Insufficient Coins!",
        text: `You need ${item.cost} coins to buy ${item.name}.`,
        confirmButtonText: "OK",
      });
    }
  };

  const completeQuest = (questId) => {
    const updatedQuests = { ...quests };
    if (!updatedQuests[questId].completed) {
      updatedQuests[questId].completed = true;
      setCoins(coins + updatedQuests[questId].reward);
      setQuests(updatedQuests);
      Swal.fire({
        icon: "success",
        title: "Quest Completed!",
        text: `You earned ${updatedQuests[questId].reward} coins!`,
        confirmButtonText: "OK",
      });
    }
  };

  const styles = {
    containerFluid: {
      padding: 0,
      position: "relative",
      fontFamily: "'Cinzel', serif",
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
      backgroundColor: "rgba(0, 0, 0, 0)", // Transparent to show the starry background
      zIndex: 0,
    },
    topBar: {
      position: "fixed",
      top: 0,
      width: "100%",
      height: "60px",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 1000,
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
      padding: "0 40px",
    },
    profileSection: {
      display: "flex",
      alignItems: "center",
      marginRight: "20px",
    },
    profileImage: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      border: "4px solid #ffd700",
      boxShadow: "0 0 10px rgba(255, 215, 0, 0.7)",
      marginRight: "10px",
      cursor: "pointer",
    },
    username: {
      fontFamily: "'Cinzel', serif",
      fontSize: "16px",
      color: "#fff",
      textShadow: "0 0 5px rgba(255, 255, 255, 0.7)",
    },
    rankSection: {
      display: "flex",
      alignItems: "center",
      marginRight: "20px",
    },
    rankImage: {
      width: "40px",
      height: "40px",
      marginRight: "10px",
      marginLeft: "5px",
    },
    rankName: {
      fontFamily: "'Cinzel', serif",
      fontSize: "18px",
      fontWeight: "bold",
      color: "#ffd700",
      textShadow: "0 0 5px rgba(255, 215, 0, 0.5)",
      padding: "2px 10px",
      borderRadius: "10px",
      border: "2px solid #ffd700",
    },
    modeTextRanked: {
      fontFamily: "'Cinzel', serif",
      fontSize: "20px",
      fontWeight: "bold",
      color: "#ffd700",
      textShadow: "0 0 5px rgba(255, 215, 0, 0.7), 0 0 10px rgba(255, 215, 0, 0.5)",
      margin: "0 15px",
      cursor: "pointer",
      textDecoration: "none",
      padding: "5px 10px",
      borderRadius: "5px",
    },
    modeTextNormal: {
      fontFamily: "'Cinzel', serif",
      fontSize: "20px",
      fontWeight: "bold",
      color: "#00ff00",
      textShadow: "0 0 5px rgba(0, 255, 0, 0.7), 0 0 10px rgba(0, 255, 0, 0.5)",
      margin: "0 15px",
      cursor: "pointer",
      textDecoration: "none",
      padding: "5px 10px",
      borderRadius: "5px",
    },
    modeTextDashboard: {
      fontFamily: "'Cinzel', serif",
      fontSize: "20px",
      fontWeight: "bold",
      color: "#007bff",
      textShadow: "0 0 5px rgba(0, 123, 255, 0.7), 0 0 10px rgba(0, 123, 255, 0.5)",
      margin: "0 15px",
      cursor: "pointer",
      textDecoration: "none",
      padding: "5px 10px",
      borderRadius: "5px",
    },
    coins: {
      fontFamily: "'Cinzel', serif",
      fontSize: "16px",
      color: "#ffd700",
      textShadow: "0 0 5px rgba(255, 215, 0, 0.7)",
      margin: "0 15px",
      display: "flex",
      alignItems: "center",
    },
    coinsIcon: {
      width: "20px",
      height: "20px",
      marginRight: "5px",
    },
    xpBarContainer: {
      width: "150px",
      margin: "0 15px",
    },
    xpBar: {
      height: "6px",
      borderRadius: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    xpBarFill: {
      height: "100%",
      borderRadius: "4px",
      backgroundColor: "#28a745",
      transition: "width 0.3s ease-in-out",
    },
    dashboardContent: {
      marginTop: "60px",
      flex: 1,
      padding: "10px",
      fontFamily: "'Cinzel', serif",
      display: "flex",
    },
    sidebar: {
      position: "fixed",
      top: "60px",
      left: 0,
      width: "60px",
      height: "calc(100vh - 60px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 0",
      zIndex: 1000,
    },
    sidebarIcon: {
      width: "40px",
      height: "40px",
      margin: "10px 0",
      cursor: "pointer",
      filter: "drop-shadow(0 0 5px rgba(255, 215, 0, 0.7))", // Stand out effect
    },
    mainContent: {
      marginLeft: "70px",
      flex: 1,
      display: "flex",
      flexDirection: "row",
    },
    expandableSection: {
      marginLeft: "70px", // Place beside sidebar
      display: "flex",
      flexDirection: "column",
    },
    storeSection: {
      width: isStoreOpen ? "300px" : "0",
      backgroundColor: "rgba(0, 123, 255, 0.3)", // Blue for store
      padding: isStoreOpen ? "10px" : "0",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      overflow: "hidden",
      transition: "width 0.3s ease-in-out",
      marginBottom: "10px",
    },
    questsSection: {
      width: isQuestsOpen ? "300px" : "0",
      backgroundColor: "rgba(0, 255, 0, 0.3)", // Green for quests
      padding: isQuestsOpen ? "10px" : "0",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      overflow: "hidden",
      transition: "width 0.3s ease-in-out",
      marginBottom: "10px",
    },
    leaderboardSection: {
      flex: "1",
      padding: "10px",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)", // Floating effect
      marginRight: "10px",
    },
    tasksSection: {
      flex: "1",
      maxWidth: "900px", // Narrower tasks section
      padding: "10px",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)", // Floating effect
      marginRight: "10px",
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
      fontFamily: "'Cinzel', serif",
    },
    btnPlus: {
      backgroundColor: "#28a745",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "0.8rem",
      cursor: "pointer",
      fontFamily: "'Cinzel', serif",
    },
    btnDanger: {
      backgroundColor: "#dc3545",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "0.8rem",
      cursor: "pointer",
      fontFamily: "'Cinzel', serif",
    },
    btnBuy: {
      backgroundColor: "#007bff",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "0.8rem",
      marginLeft: "5px",
      cursor: "pointer",
      fontFamily: "'Cinzel', serif",
    },
    boostBadge: {
      backgroundColor: "#007bff",
      color: "#fff",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "0.7rem",
      marginLeft: "5px",
      fontFamily: "'Cinzel', serif",
    },
    boostName: {
      marginLeft: "5px",
      fontFamily: "'Cinzel', serif",
    },
    taskNotification: {
      position: "absolute",
      top: "-20px",
      right: "0",
      fontSize: "12px",
      color: "#28a745",
      fontWeight: "bold",
      animation: "popUp 2s ease-in-out forwards",
      fontFamily: "'Cinzel', serif",
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
        style={styles.videoBackground}
      >
        <source src="/videos/backvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div style={styles.videoOverlay}></div>

      <div style={styles.topBar}>
        {/* Far Left: Rank and Profile */}
        <div style={styles.rankSection}>
          <img src={userProfile.rankImage} alt={userProfile.rankName} style={styles.rankImage} />
          <span style={styles.rankName}>{userProfile.rankName}</span>
        </div>
        <div style={styles.profileSection}>
          <Link to="/profile">
            <img
              src={userProfile.photo || "../profile-images/default-profile.png"}
              alt="Profile"
              style={styles.profileImage}
            />
          </Link>
          <span style={styles.username}>{userProfile.name}</span>
        </div>

        {/* Middle: Mode Selection */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link to="/ranked-mode" style={styles.modeTextRanked}>
            Ranked Mode
          </Link>
          <Link to="/normal-mode" style={styles.modeTextNormal}>
            Normal Mode
          </Link>
          <Link to="/dashboard" style={styles.modeTextDashboard}>
            Dashboard
          </Link>
        </div>

        {/* Far Right: Coins and XP */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={styles.coins}>
            <img src="/coin.png" alt="Coins" style={styles.coinsIcon} />
            {coins.toLocaleString()}
          </div>
          <div style={styles.xpBarContainer}>
            <div style={styles.xpBar}>
              <div
                style={{
                  ...styles.xpBarFill,
                  width: `${xpPercentage}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={styles.dashboardContent}>
        <div style={{ display: "flex" }}>
          {/* Sidebar with Icons */}
          <div style={styles.sidebar}>
            <img
              src="/icons/instore.png"
              alt="In Store"
              style={styles.sidebarIcon}
              onClick={toggleStore}
            />
            <img
              src="/icons/quest.png"
              alt="Quests"
              style={styles.sidebarIcon}
              onClick={toggleQuests}
            />
          </div>

          {/* Expandable Sections */}
          <div style={styles.expandableSection}>
            <div style={styles.storeSection}>
              {isStoreOpen && (
                <div>
                  <h6 style={{ color: "#007bff", marginBottom: "10px" }}>In Store</h6>
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {Object.entries(storeItems).map(([itemId, item]) => (
                      <li key={itemId} style={{ marginBottom: "10px", color: "#fff" }}>
                        {item.name} - {item.cost} Coins
                        <button
                          onClick={() => buyItem(itemId)}
                          style={styles.btnBuy}
                          className="ms-1"
                        >
                          Buy
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={styles.questsSection}>
              {isQuestsOpen && (
                <div>
                  <h6 style={{ color: "#007bff", marginBottom: "10px" }}>Quests</h6>
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    {Object.entries(quests).map(([questId, quest]) => (
                      <li key={questId} style={{ marginBottom: "10px", color: "#fff" }}>
                        {quest.name} - {quest.reward} Coins
                        <button
                          onClick={() => completeQuest(questId)}
                          style={styles.btnPlus}
                          disabled={quest.completed}
                          className="ms-1"
                        >
                          {quest.completed ? "Completed" : "Complete"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "row" }}>
            {/* Leaderboard Section */}
            <div style={styles.leaderboardSection}>
              <h6 style={{ color: "#007bff", textAlign: "center", marginBottom: "10px" }}>Leaderboard</h6>
              <table style={{ width: "100%", color: "#fff" }}>
                <thead style={{ backgroundColor: "#007bff" }}>
                  <tr>
                    <th style={{ padding: "5px" }}>#</th>
                    <th style={{ padding: "5px" }}>Name</th>
                    <th style={{ padding: "5px" }}>Rank</th>
                    <th style={{ padding: "5px" }}>XP</th>
                  </tr>
                </thead>
                <tbody style={{ overflowY: "auto", maxHeight: "calc(100% - 40px)" }}>
                  {leaderboardUsers.map((user, index) => (
                    <tr key={user.uid} style={index < 3 ? { backgroundColor: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : "#cd7f32" } : { backgroundColor: "transparent" }}>
                      <td style={{ padding: "5px" }}>{index + 1}</td>
                      <td style={{ padding: "5px" }}>
                        <img
                          src={user.photo}
                          alt={`${user.name}'s profile`}
                          style={{ width: "30px", height: "30px", borderRadius: "50%", marginRight: "10px", objectFit: "cover" }}
                        />
                        {user.name}
                      </td>
                      <td style={{ padding: "5px" }}>{user.rankName}</td>
                      <td style={{ padding: "5px" }}>{user.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tasks Section */}
            <div style={styles.tasksSection}>
              <h6 style={{ color: "#007bff", marginBottom: "10px" }}>Available Ranked Tasks</h6>
              <div className="accordion" id="tasksAccordion">
                {Object.entries(groupedTasks).map(([category, categoryTasks], index) => (
                  <div className="accordion-item" key={category}>
                    <h2 className="accordion-header" id={`heading-${category}`}>
                      <button
                        className={`accordion-button ${!openSections[category] ? 'collapsed' : ''}`}
                        type="button"
                        style={{
                          // backgroundColor: "transparent",
                          // color: "#fff",
                          border: "none",
                          fontFamily: "'Cinzel', serif",
                        }}
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
                      <div style={{ backgroundColor: "transparent" }} className="accordion-body">
                        <ul style={{ listStyle: "none", padding: 0 }}>
                          {categoryTasks.map((task, taskIndex) => {
                            const originalIndex = rankedTasks.findIndex(t => t.taskId === task.taskId || (t.name && t.name === task.name));
                            const currentLevel = task.level || 1;
                            const maxLevel = task.maxLevel || 3;
                            const taskId = task.taskId || (task.name ? task.name.toLowerCase().replace(/ /g, '_').replace(/:/g, '_') : "unnamed_task");
                            const levelData = TASK_LEVELS[taskId]?.[currentLevel] || { xp: task.xp || 0, requiredCompletionsForNextLevel: 1, name: task.name || "Unnamed Task" };
                            const progress = (task.completionCount || 0) / (levelData.requiredCompletionsForNextLevel || 1);
                            const canUpgrade = progress >= 1 && currentLevel < maxLevel;

                            return (
                              <li
                                key={taskIndex}
                                style={{
                                  // backgroundColor: "transparent",
                                  // color: "#fff",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  padding: "10px",
                                  marginBottom: "5px",
                                  position: "relative",
                                  fontFamily: "'Cinzel', serif",
                                  fontWeight: "bold",
                                  boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)", // Floating effect
                                }}
                              >
                                <div>
                                  <span style={{ color: "rgb(189, 26, 26)" }}>{task.name || "Unnamed Task"}</span>
                                  <br />
                                  <small style={{ color: "black" }}>
                                    ({task.xp || 0} XP) | Completions: {task.completionCount || 0}/{levelData.requiredCompletionsForNextLevel || 1}
                                  </small>
                                  {levelData.requiredCompletionsForNextLevel && (
                                    <div style={{ display: "flex", alignItems: "center"}}>
                                      <div style={styles.progressBar}>
                                        <div
                                          style={{
                                            ...styles.progressBarFill,
                                            width: `${Math.min(progress, 1) * 100}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <button
                                    onClick={() => completeTask(originalIndex)}
                                    style={styles.btnPlus}
                                  >
                                    <i className="bi bi-plus-lg"></i>
                                  </button>
                                  {task.boost && (
                                    <button
                                      onClick={() => removeBoost(originalIndex)}
                                      style={styles.btnDanger}
                                      className="ms-1"
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
                                      style={styles.taskNotification}
                                    >
                                      {notification.xp ? `+${notification.xp} XP` : ""}
                                    </div>
                                  ))}
                              </li>
                            );
                          })}
                        </ul>
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