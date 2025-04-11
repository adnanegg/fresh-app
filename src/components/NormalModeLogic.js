import { useState, useEffect, useMemo, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, get, update } from "firebase/database";
import Swal from "sweetalert2";

const BONUS_POINTS = 10;
const BOOSTS = {
  DoubleEverything: {
    multiplier: 2,
    type: "all",
    description: "Doubles Points for this task",
  },
  "+30Percent": {
    percentage: 0.3,
    type: "all",
    description: "Increases Points by 30% for this task",
  },
  TheSavior: {
    type: "savior",
    description: "Enables multiple completions per day",
  },
  DoubleOrDie: {
    multiplier: 2,
    type: "doubleOrDie",
    description: "Doubles points if completed, -10 if missed by reset",
  },
  PerfectBonus: {
    bonus: 50,
    type: "perfectBonus",
    description: "Sets perfect completion bonus to 50 points",
  },
};

// Map categories to star types
const STAR_TYPES = {
  Average: "bronze",
  Advanced: "silver",
  Master: "gold",
};

export const useNormalModeLogic = (globalTasks, refreshGlobalTasks) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [userData, setUserData] = useState(() => {
    const storedData = localStorage.getItem(`userData_${userId}`);
    const parsedData = storedData ? JSON.parse(storedData) : {};
    const cachedGlobalTasks =
      JSON.parse(localStorage.getItem("globalTasks")) || globalTasks;

    let initialTasks = [];
    if (parsedData.tasks && typeof parsedData.tasks === "object") {
      initialTasks = Object.keys(cachedGlobalTasks).map((taskId) => ({
        ...cachedGlobalTasks[taskId],
        taskId,
        completionCount: parsedData.tasks[taskId]?.completionCount || 0,
        lifetimeCompletionCount:
          parsedData.tasks[taskId]?.lifetimeCompletionCount || 0,
        dailyCounter: parsedData.tasks[taskId]?.dailyCounter || 0,
        boost: parsedData.tasks[taskId]?.boost || null,
        hasTimesOption:
          parsedData.tasks[taskId]?.hasTimesOption ||
          cachedGlobalTasks[taskId]?.hasTimesOption ||
          false,
        selectedMode: parsedData.tasks[taskId]?.selectedMode || "normal",
      }));
    } else {
      initialTasks = Object.keys(cachedGlobalTasks).map((taskId) => ({
        ...cachedGlobalTasks[taskId],
        taskId,
        completionCount: 0,
        lifetimeCompletionCount: 0,
        dailyCounter: 0,
        boost: null,
        hasTimesOption: cachedGlobalTasks[taskId].hasTimesOption || false,
        selectedMode: "normal",
      }));
    }

    return {
      profile: parsedData.profile || { name: "User" },
      points: parsedData.points || { current: 0, total: 800 },
      Mpoints: parsedData.Mpoints || { current: 0, total: 2800 },
      tasks: initialTasks,
      completedTasks: Array.isArray(parsedData.completedTasks)
        ? parsedData.completedTasks
        : [],
      achievements: parsedData.achievements || {},
      lastUpdated: parsedData.lastUpdated || Date.now(),
    };
  });
  const [notifications, setNotifications] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState("");
  const [selectedBoost, setSelectedBoost] = useState("");
  const [taskTimes, setTaskTimes] = useState({});
  const [isCompletedTasksOpen, setIsCompletedTasksOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false); // Track auth initialization

  useEffect(() => {
    let timeoutId;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      const storedUserId = localStorage.getItem("userId");

      if (!authInitialized) {
        // Wait briefly for Firebase to stabilize auth state
        timeoutId = setTimeout(() => {
          setAuthInitialized(true);
        }, 1000); // 1-second grace period
        return;
      }

      if (user && isLoggedIn && storedUserId === user.uid) {
        setUserId(user.uid);
        setIsLoading(false);
      } else if (!user && isLoggedIn) {
        // Only logout if auth is fully initialized and user is still null
        setUserId(null);
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userId");
        navigate("/login");
      } else if (!isLoggedIn) {
        navigate("/login");
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, globalTasks, authInitialized]);

  const groupedTasks = useMemo(() => {
    if (!Array.isArray(userData.tasks)) return {};
    return userData.tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {});
  }, [userData.tasks]);

  const syncWithFirebase = useCallback(
    async (forceSync = false) => {
      if (!userId) return;
      const localData =
        JSON.parse(localStorage.getItem(`userData_${userId}`)) || {};
      if (!forceSync && localData.lastUpdated === userData.lastUpdated) return;

      try {
        if (localData.tasks && localData.points) {
          const tasksToSync = Object.fromEntries(
            localData.tasks.map((task) => [
              task.taskId,
              {
                completionCount: task.completionCount,
                lifetimeCompletionCount: task.lifetimeCompletionCount,
                dailyCounter: task.dailyCounter,
                boost: task.boost,
                hasTimesOption: task.hasTimesOption,
                selectedMode: task.selectedMode,
              },
            ])
          );
          await update(ref(database, `users/${userId}`), {
            ...localData,
            tasks: tasksToSync,
            lastUpdated: Date.now(),
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Sync Failed",
          text: `Failed to sync data: ${error.message}. Your changes are saved locally.`,
        });
        throw error;
      }
    },
    [userId, userData.lastUpdated]
  );

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const initializeUserData = async () => {
      try {
        const userRef = ref(database, `users/${userId}`);
        const achievementsRef = ref(database, "achievements");
        const [userSnapshot, achievementsSnapshot] = await Promise.all([
          get(userRef),
          get(achievementsRef),
        ]);
        const firebaseData = userSnapshot.val() || {};
        const cachedGlobalTasks =
          JSON.parse(localStorage.getItem("globalTasks")) || globalTasks;
        const cachedAchievements =
          JSON.parse(localStorage.getItem("achievements")) ||
          achievementsSnapshot.val() ||
          {};
        localStorage.setItem(
          "achievements",
          JSON.stringify(cachedAchievements)
        );

        const initialTasks = Object.keys(cachedGlobalTasks).map((taskId) => {
          const userTask = firebaseData.tasks?.[taskId] || {};
          return {
            ...cachedGlobalTasks[taskId],
            taskId,
            completionCount: userTask.completionCount || 0,
            lifetimeCompletionCount: userTask.lifetimeCompletionCount || 0,
            dailyCounter: userTask.dailyCounter || 0,
            boost: userTask.boost || null,
            hasTimesOption:
              userTask.hasTimesOption ||
              cachedGlobalTasks[taskId]?.hasTimesOption ||
              false,
            selectedMode: userTask.selectedMode || "normal",
          };
        });

        const initialUserData = {
          profile: firebaseData.profile || { name: "User" },
          points: firebaseData.points || { current: 0, total: 800 },
          Mpoints: firebaseData.Mpoints || { current: 0, total: 2800 },
          tasks: initialTasks,
          completedTasks: Array.isArray(firebaseData.completedTasks)
            ? firebaseData.completedTasks
            : [],
          achievements: firebaseData.achievements || {},
          lastUpdated: firebaseData.lastUpdated || Date.now(),
        };

        localStorage.setItem(
          `userData_${userId}`,
          JSON.stringify(initialUserData)
        );
        setUserData(initialUserData);
        setOpenSections(
          Object.keys(groupedTasks).reduce(
            (acc, category) => ({ ...acc, [category]: category === "Task" }),
            {}
          )
        );
      } catch (error) {
        console.error("Initialization error:", error);
        const storedData = localStorage.getItem(`userData_${userId}`);
        if (storedData) setUserData(JSON.parse(storedData));
      }
    };

    initializeUserData();
    return () => syncWithFirebase(true);
  }, [navigate, userId, globalTasks]);

  const updateLocalData = useCallback(
    (newData) => {
      const updatedData = { ...userData, ...newData, lastUpdated: Date.now() };
      localStorage.setItem(`userData_${userId}`, JSON.stringify(updatedData));
      setUserData(updatedData);
    },
    [userData, userId]
  );

  const toggleSection = useCallback(
    (category) =>
      setOpenSections((prev) => ({ ...prev, [category]: !prev[category] })),
    []
  );

  const handleModeChange = useCallback(
    (index, newMode) => {
      const updatedTasks = userData.tasks.map((t, i) =>
        i === index ? { ...t, selectedMode: newMode } : t
      );
      updateLocalData({ tasks: updatedTasks });
    },
    [userData.tasks, updateLocalData]
  );

  const applyBoost = useCallback(async () => {
    if (selectedTaskIndex === "" || !selectedBoost) {
      Swal.fire({
        icon: "warning",
        title: "Selection Required",
        text: "Please select a task and a boost.",
      });
      return;
    }
    const task = userData.tasks[selectedTaskIndex];
    if (task.boost) {
      Swal.fire({
        icon: "warning",
        title: "Boost Already Applied",
        text: `A boost (${task.boost}) is already applied to "${task.name}".`,
      });
      return;
    }
    const result = await Swal.fire({
      title: `Apply ${selectedBoost}?`,
      text: BOOSTS[selectedBoost].description,
      icon: "question",
      showCancelButton: true,
    });
    if (result.isConfirmed) {
      const updatedTasks = userData.tasks.map((t, i) =>
        i === Number(selectedTaskIndex)
          ? {
              ...t,
              boost: selectedBoost,
              hasTimesOption:
                selectedBoost === "TheSavior" ? true : t.hasTimesOption,
            }
          : t
      );
      updateLocalData({ tasks: updatedTasks });
      Swal.fire({
        icon: "success",
        title: "Boost Applied!",
        text: `Boost ${selectedBoost} applied to ${task.name}.`,
      });
    }
    setSelectedTaskIndex("");
    setSelectedBoost("");
  }, [userData.tasks, selectedTaskIndex, selectedBoost, updateLocalData]);

  const removeBoost = useCallback(
    async (index) => {
      const task = userData.tasks[index];
      if (!task.boost) {
        Swal.fire({
          icon: "warning",
          title: "No Boost",
          text: `No boost is applied to "${task.name}".`,
        });
        return;
      }
      const result = await Swal.fire({
        title: "Remove Boost?",
        text: `Remove ${task.boost} from "${task.name}"?`,
        icon: "question",
        showCancelButton: true,
      });
      if (result.isConfirmed) {
        const updatedTasks = userData.tasks.map((t, i) =>
          i === index
            ? {
                ...t,
                boost: null,
                hasTimesOption:
                  task.boost === "TheSavior" ? false : t.hasTimesOption,
              }
            : t
        );
        updateLocalData({ tasks: updatedTasks });
        Swal.fire({
          icon: "success",
          title: "Boost Removed!",
          text: `Boost removed from ${task.name}.`,
        });
      }
    },
    [userData.tasks, updateLocalData]
  );

  const handleTimesChange = useCallback((index, value) => {
    setTaskTimes((prev) => ({
      ...prev,
      [index]: value === "" ? "" : Math.max(1, parseInt(value) || 1),
    }));
  }, []);

  const completeTask = useCallback(
    (index) => {
      const task = userData.tasks[index];
      if (!task || typeof task.points !== "number") return;

      const times = task.hasTimesOption ? taskTimes[index] || 1 : 1;
      if (task.dailyCounter + times > task.dailyLimit) {
        Swal.fire({
          icon: "warning",
          title: "Daily Limit Reached",
          text: `Daily limit of ${task.dailyLimit} reached for "${task.name}".`,
        });
        return;
      }
      if (task.completionCount >= task.numberLimit) {
        Swal.fire({
          icon: "warning",
          title: "Task Limit Reached",
          text: `"${task.name}" completed max times (${task.numberLimit}).`,
        });
        return;
      }
      const newCompletionCount = task.completionCount + times;
      const newLifetimeCompletionCount = task.lifetimeCompletionCount + times;
      if (newCompletionCount > task.numberLimit) {
        Swal.fire({
          icon: "warning",
          title: "Exceeds Limit",
          text: `Completing ${times} times exceeds limit of ${task.numberLimit}.`,
        });
        return;
      }

      let effectivePoints = task.points;
      let bonusPoints = 0;
      if (task.hasExceptionalOption) {
        if (task.selectedMode === "exceptional")
          effectivePoints = task.points / 2;
        else if (task.selectedMode === "penalty")
          effectivePoints = -(task.penaltyPoints || task.penalty || 10);
      }
      if (
        task.boost &&
        (!task.hasExceptionalOption || task.selectedMode !== "penalty")
      ) {
        const boost = BOOSTS[task.boost];
        if (boost.multiplier) effectivePoints *= boost.multiplier;
        else if (boost.percentage) effectivePoints *= 1 + boost.percentage;
      }
      const totalPoints = effectivePoints * times;
      if (
        newCompletionCount === task.numberLimit &&
        (!task.hasExceptionalOption || task.selectedMode !== "penalty")
      ) {
        bonusPoints =
          task.boost === "PerfectBonus"
            ? BOOSTS["PerfectBonus"].bonus
            : BONUS_POINTS;
      }

      const updatedTask = {
        ...task,
        completionCount: newCompletionCount,
        lifetimeCompletionCount: newLifetimeCompletionCount,
        dailyCounter: task.dailyCounter + times,
      };
      const newTasks = userData.tasks.map((t, i) =>
        i === index ? updatedTask : t
      );
      const newCompletedTasks = [...userData.completedTasks];
      const existingIndex = newCompletedTasks.findIndex(
        (t) => t.name === task.name
      );

      if (existingIndex === -1) {
        newCompletedTasks.push({
          name: task.name,
          basePoints: task.points,
          points: totalPoints,
          completionCount: times,
          bonusPoints,
          boost: task.boost || null,
          numberLimit: task.numberLimit,
          hasTimesOption: task.hasTimesOption,
          hasExceptionalOption: task.hasExceptionalOption || false,
          category: task.category || "Task",
          frequencyUnit: task.frequencyUnit || "days",
          weeklyFrequency: task.weeklyFrequency || 1,
          requiredCompletions: task.requiredCompletions || 1,
          dailyLimit: task.dailyLimit,
          dailyCounter: times,
          penaltyPoints: task.penaltyPoints || task.penalty || 0,
          ...(task.hasExceptionalOption
            ? {
                selectedMode: task.selectedMode || "normal",
                isPenalty: task.selectedMode === "penalty",
              }
            : {}),
          ...(task.hasTimesOption ? { times } : {}),
        });
      } else {
        const existingTask = newCompletedTasks[existingIndex];
        newCompletedTasks[existingIndex] = {
          ...existingTask,
          points: existingTask.points + totalPoints,
          completionCount: existingTask.completionCount + times,
          bonusPoints:
            newCompletionCount === task.numberLimit && !existingTask.bonusPoints
              ? bonusPoints
              : existingTask.bonusPoints,
          dailyCounter: existingTask.dailyCounter + times,
        };
      }

      // Check achievements and assign stars
      const cachedAchievements =
        JSON.parse(localStorage.getItem("achievements")) || {};
      const newAchievements = { ...userData.achievements };
      Object.entries(cachedAchievements).forEach(
        ([category, categoryAchievements]) => {
          categoryAchievements.forEach((achievement) => {
            if (
              achievement.taskId === task.taskId &&
              newLifetimeCompletionCount >= achievement.target &&
              !newAchievements[achievement.name]
            ) {
              const starType = STAR_TYPES[category] || "bronze"; // Default to bronze if category not mapped
              newAchievements[achievement.name] = {
                ...achievement,
                earnedAt: Date.now(),
                star: starType, // Assign star based on category
              };
              Swal.fire({
                icon: "success",
                title: "Achievement Unlocked!",
                text: `${achievement.name}: ${achievement.description} (${starType} Star)`,
              });
            }
          });
        }
      );

      const newPointsData = {
        ...userData.points,
        current: Math.max(
          userData.points.current + totalPoints + bonusPoints,
          0
        ),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(
          userData.Mpoints.current + totalPoints + bonusPoints,
          0
        ),
      };
      updateLocalData({
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        points: newPointsData,
        Mpoints: newMpointsData,
        achievements: newAchievements,
      });

      setTaskTimes((prev) => ({ ...prev, [index]: "" }));
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          position: `task-${index}`,
          points: totalPoints + bonusPoints,
        },
      ]);
      setTimeout(
        () =>
          setNotifications((prev) => prev.filter((n) => n.id !== Date.now())),
        3000
      );
    },
    [userData, taskTimes, updateLocalData]
  );

  const undoTask = useCallback(
    (index) => {
      const task = userData.completedTasks[index];
      const taskIndex = userData.tasks.findIndex((t) => t.name === task.name);
      const originalTask = taskIndex !== -1 ? userData.tasks[taskIndex] : null;

      const newCompletionCount = Math.max(task.completionCount - 1, 0);
      const newLifetimeCompletionCount = Math.max(
        originalTask?.lifetimeCompletionCount - 1 || 0,
        0
      );
      const newDailyCounter = Math.max(task.dailyCounter - 1, 0);
      let pointsToAdjust = task.points / task.completionCount;
      if (task.hasExceptionalOption) {
        if (task.selectedMode === "penalty")
          pointsToAdjust = -(task.penaltyPoints || task.penalty || 10);
        else if (task.selectedMode === "exceptional")
          pointsToAdjust = task.basePoints / 2;
      }
      if (task.bonusPoints && task.completionCount === task.numberLimit)
        pointsToAdjust += task.bonusPoints;

      const newCompletedTasks = [...userData.completedTasks];
      if (newCompletionCount > 0) {
        newCompletedTasks[index] = {
          ...task,
          completionCount: newCompletionCount,
          points: task.points - pointsToAdjust,
          dailyCounter: newDailyCounter,
          bonusPoints:
            newCompletionCount === task.numberLimit - 1 ? 0 : task.bonusPoints,
          ...(task.hasTimesOption
            ? { times: Math.max((task.times || task.completionCount) - 1, 0) }
            : {}),
        };
      } else {
        newCompletedTasks.splice(index, 1);
      }

      const newTasks = originalTask
        ? userData.tasks.map((t, i) =>
            i === taskIndex
              ? {
                  ...t,
                  completionCount: Math.max(t.completionCount - 1, 0),
                  lifetimeCompletionCount: newLifetimeCompletionCount,
                  dailyCounter: newDailyCounter,
                }
              : t
          )
        : userData.tasks;
      const newPointsData = {
        ...userData.points,
        current: Math.max(userData.points.current - pointsToAdjust, 0),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(userData.Mpoints.current - pointsToAdjust, 0),
      };
      updateLocalData({
        tasks: newTasks,
        completedTasks: newCompletedTasks,
        points: newPointsData,
        Mpoints: newMpointsData,
      });
    },
    [userData, updateLocalData]
  );

  const resetTaskCompletionCount = useCallback(
    (index) => {
      const task = userData.tasks[index];
      const updatedTasks = userData.tasks.map((t, i) =>
        i === index ? { ...t, completionCount: 0, dailyCounter: 0 } : t
      );
      updateLocalData({ tasks: updatedTasks });
      Swal.fire({
        icon: "success",
        title: "Task Reset",
        text: `"${task.name}" has been reset.`,
      });
    },
    [userData.tasks, updateLocalData]
  );

  const resetCompletedTasks = useCallback(() => {
    const taskMap = new Map();
    userData.completedTasks.forEach((completedTask) =>
      taskMap.set(completedTask.name, { ...completedTask, dailyCounter: 0 })
    );
    const resetTasks = userData.tasks.map((task) =>
      taskMap.get(task.name) ? { ...task, dailyCounter: 0 } : task
    );
    updateLocalData({ tasks: resetTasks, completedTasks: [] });
    Swal.fire({
      icon: "success",
      title: "Tasks Reset!",
      text: "All tasks returned to Daily Tasks.",
    });
  }, [userData, updateLocalData]);

  const resetAllTaskCompletionCount = useCallback(() => {
    const resetTasks = userData.tasks.map((task) => ({
      ...task,
      completionCount: 0,
      dailyCounter: 0,
    }));
    updateLocalData({ tasks: resetTasks });
    Swal.fire({
      icon: "success",
      title: "All Tasks Reset!",
      text: "All task completions reset to 0.",
    });
  }, [userData.tasks, updateLocalData]);

  const resetPointsBar = useCallback(() => {
    const newPointsData = { current: 0, total: 800 };
    updateLocalData({ points: newPointsData });
    Swal.fire({
      icon: "success",
      title: "Points Bar Reset!",
      text: "Points reset to 0.",
    });
  }, [updateLocalData]);

  const resetMonthlyPointsBar = useCallback(() => {
    const newMpointsData = { current: 0, total: 2800 };
    updateLocalData({ Mpoints: newMpointsData });
    Swal.fire({
      icon: "success",
      title: "Monthly Points Reset!",
      text: "Monthly points reset to 0.",
    });
  }, [updateLocalData]);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      await syncWithFirebase(true);
      await signOut(auth);
      localStorage.removeItem(`userData_${userId}`);
      navigate("/login");
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [navigate, syncWithFirebase, userId]);

  const startTheWeek = useCallback(async () => {
    const weekArchive = {
      timestamp: Date.now(),
      weekNumber: userData.currentWeek || 1,
      completedTasks: [...userData.completedTasks],
      points: userData.points.current,
      Mpoints: userData.Mpoints.current,
    };

    try {
      await update(ref(database, `users/${userId}/historicalCompletions`), {
        [weekArchive.weekNumber]: weekArchive.completedTasks.reduce(
          (acc, task) => {
            acc[task.taskId || task.name] = task.completionCount;
            return acc;
          },
          {}
        ),
      });
      await update(ref(database, `users/${userId}`), {
        currentWeek: (userData.currentWeek || 1) + 1,
        completedTasks: [],
        tasks: userData.tasks.reduce((acc, task) => {
          acc[task.taskId] = {
            ...task,
            completionCount: 0,
            dailyCounter: 0,
            boost: null, // Remove boost
            hasTimesOption: task.hasTimesOption && task.boost !== "TheSavior", // Reset hasTimesOption if it was set by TheSavior
          };
          return acc;
        }, {}),
        points: { current: 0, total: 800 },
      });

      const resetTasks = userData.tasks.map((task) => ({
        ...task,
        completionCount: 0,
        dailyCounter: 0,
        boost: null, // Remove boost
        hasTimesOption: task.hasTimesOption && task.boost !== "TheSavior", // Reset hasTimesOption if it was set by TheSavior
      }));
      updateLocalData({
        tasks: resetTasks,
        completedTasks: [],
        points: { current: 0, total: 800 },
        currentWeek: (userData.currentWeek || 1) + 1,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.setItem("statsRefreshTimestamp", Date.now().toString());

      Swal.fire({
        icon: "success",
        title: "New Week Started!",
        html: `<div><p>All counters and boosts reset. Week ${
          (userData.currentWeek || 1) + 1
        } started.</p><small>Previous week's data archived for statistics.</small></div>`,
      });
    } catch (error) {
      console.error("Failed to archive week:", error);
      Swal.fire({
        icon: "error",
        title: "Week Start Failed",
        text: "Failed to start new week. Please try again.",
      });
    }
  }, [userData, updateLocalData, userId]);

  const startTheDay = useCallback(() => {
    // Check for DoubleOrDie tasks not completed today
    const doubleOrDieTasks = userData.tasks.filter(
      (task) => task.boost === "DoubleOrDie"
    );
    let penalty = 0;
    doubleOrDieTasks.forEach((task) => {
      const completedToday = userData.completedTasks.some(
        (completed) =>
          completed.name === task.name && completed.dailyCounter > 0
      );
      if (!completedToday) {
        penalty += 10; // Deduct 10 points for each missed DoubleOrDie task
      }
    });

    const resetTasks = userData.tasks.map((task) => ({
      ...task,
      dailyCounter: 0,
    }));
    const resetCompletedTasks = userData.completedTasks.map((task) => ({
      ...task,
      dailyCounter: 0,
    }));

    const newPointsData = {
      ...userData.points,
      current: Math.max(userData.points.current - penalty, 0),
    };
    const newMpointsData = {
      ...userData.Mpoints,
      current: Math.max(userData.Mpoints.current - penalty, 0),
    };

    updateLocalData({
      tasks: resetTasks,
      completedTasks: resetCompletedTasks,
      points: newPointsData,
      Mpoints: newMpointsData,
    });

    Swal.fire({
      icon: "success",
      title: "Day Started!",
      text:
        penalty > 0
          ? `Daily counters reset. ${penalty} points deducted for missed DoubleOrDie tasks.`
          : "Daily counters reset.",
    });
  }, [userData, updateLocalData]);

  const getProgressColor = (current, total) => {
    const percentage = (current / total) * 100;
    if (percentage >= 75) return "#28a745";
    if (percentage >= 25) return "#ffc107";
    return "#dc3545";
  };

  const toggleAchievements = () => setIsAchievementsOpen((prev) => !prev);

  return {
    userData,
    notifications,
    openSections,
    isLoading,
    selectedTaskIndex,
    setSelectedTaskIndex,
    selectedBoost,
    setSelectedBoost,
    taskTimes,
    isCompletedTasksOpen,
    groupedTasks,
    syncWithFirebase,
    updateLocalData,
    toggleSection,
    handleModeChange,
    applyBoost,
    removeBoost,
    handleTimesChange,
    completeTask,
    undoTask,
    resetTaskCompletionCount,
    resetCompletedTasks,
    resetAllTaskCompletionCount,
    resetPointsBar,
    resetMonthlyPointsBar,
    handleLogout,
    startTheWeek,
    startTheDay,
    getProgressColor,
    isAchievementsOpen,
    toggleAchievements,
    refreshGlobalTasks,
  };
};
