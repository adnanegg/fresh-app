import { useState, useEffect, useMemo, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, get, update } from "firebase/database";
import Swal from "sweetalert2";

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

export const useNormalModeLogic = (
  globalTasks,
  refreshGlobalTasks,
  initialMode = "daily"
) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);

  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [isSyncing, setIsSyncing] = useState(false);

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

        bonusClaimed: parsedData.tasks[taskId]?.bonusClaimed || false,
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
        bonusClaimed: false,
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
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let timeoutId;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      const storedUserId = localStorage.getItem("userId");

      if (!authInitialized) {
        timeoutId = setTimeout(() => {
          setAuthInitialized(true);
        }, 1000);
        return;
      }

      if (user && isLoggedIn && storedUserId === user.uid) {
        setUserId(user.uid);
        setIsLoading(false);
      } else if (!user && isLoggedIn) {
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
          // Normalize tasks to an array if it's an object
          const taskArray = Array.isArray(localData.tasks)
            ? localData.tasks
            : Object.entries(localData.tasks).map(([taskId, task]) => ({
                taskId,
                ...task,
              }));

          const tasksToSync = Object.fromEntries(
            taskArray.map((task) => [
              task.taskId,
              {
                completionCount: task.completionCount || 0,
                lifetimeCompletionCount: task.lifetimeCompletionCount || 0,
                dailyCounter: task.dailyCounter || 0,
                boost: task.boost || "",
                hasTimesOption: task.hasTimesOption || false,
                selectedMode: task.selectedMode || "normal",
                bonusClaimed: task.bonusClaimed || false,
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
            bonusClaimed: userTask.bonusClaimed || false,
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
          mode: firebaseData.preferences?.mode || "daily",
          currentWeek: firebaseData.currentWeek || 1,
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
  const BONUS_POINTS = 10;

  const claimBonus = useCallback(
    async (index) => {
      const task = userData.tasks[index];
      if (task.bonusClaimed) {
        Swal.fire({
          icon: "warning",
          title: "Bonus Already Claimed",
          text: `Bonus for "${task.name}" has already been claimed.`,
        });
        return;
      }
      if (task.category === "Bonus") {
        Swal.fire({
          icon: "info",
          title: "No Bonus Available",
          text: `Tasks in the "Bonus" category do not have a claimable bonus.`,
        });
        return;
      }
      if (task.completionCount < task.numberLimit) {
        Swal.fire({
          icon: "warning",
          title: "Task Not Fully Completed",
          text: `You must complete "${task.name}" ${task.numberLimit} times to claim the bonus.`,
        });
        return;
      }

      const bonusPoints = task.boost === "PerfectBonus" ? 50 : BONUS_POINTS;

      const result = await Swal.fire({
        title: "Claim Bonus?",
        text: `Claim ${bonusPoints} bonus points for completing "${task.name}"?`,
        icon: "question",
        showCancelButton: true,
      });

      if (result.isConfirmed) {
        const updatedTasks = userData.tasks.map((t, i) =>
          i === index ? { ...t, bonusClaimed: true } : t
        );
        const newPointsData = {
          ...userData.points,
          current: userData.points.current + bonusPoints,
        };
        const newMpointsData = {
          ...userData.Mpoints,
          current: userData.Mpoints.current + bonusPoints,
        };

        updateLocalData({
          tasks: updatedTasks,
          points: newPointsData,
          Mpoints: newMpointsData,
        });

        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            position: `task-${index}`,
            points: bonusPoints,
          },
        ]);
        setTimeout(
          () =>
            setNotifications((prev) => prev.filter((n) => n.id !== Date.now())),
          3000
        );

        Swal.fire({
          icon: "success",
          title: "Bonus Claimed!",
          text: `${bonusPoints} bonus points added for "${task.name}".`,
        });
      }
    },
    [userData, updateLocalData]
  );

  const switchMode = useCallback(
    async (newMode) => {
      setMode(newMode);
      try {
        await update(ref(database, `users/${userId}/preferences`), {
          mode: newMode,
        });
      } catch (error) {
        console.error("Failed to update tracker mode in Firebase:", error);
        Swal.fire({
          icon: "error",
          title: "Mode Switch Failed",
          text: "Failed to save mode to server. Mode saved locally.",
        });
      }
      navigate(newMode === "daily" ? "/normal-mode" : "/weekly-mode");
    },
    [navigate, userId]
  );
  const completeTask = useCallback(
    (index) => {
      const task = userData.tasks[index];
      if (!task || typeof task.points !== "number") return;

      const times = task.hasTimesOption ? taskTimes[index] || 1 : 1;

      if (
        mode === "daily" &&
        task.boost !== "TheSavior" &&
        task.dailyCounter + times > task.dailyLimit
      ) {
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
          timestamp: Date.now(),
        });
      } else {
        const existingTask = newCompletedTasks[existingIndex];
        newCompletedTasks[existingIndex] = {
          ...existingTask,
          points: existingTask.points + totalPoints,
          completionCount: existingTask.completionCount + times,
          dailyCounter: existingTask.dailyCounter + times,
        };
      }

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
              const starType = STAR_TYPES[category] || "bronze";
              newAchievements[achievement.name] = {
                ...achievement,
                earnedAt: Date.now(),
                star: starType,
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
        current: Math.max(userData.points.current + totalPoints, 0),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(userData.Mpoints.current + totalPoints, 0),
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
          points: totalPoints,
        },
      ]);
      setTimeout(
        () =>
          setNotifications((prev) => prev.filter((n) => n.id !== Date.now())),
        3000
      );
    },
    [userData, taskTimes, updateLocalData, mode]
  );

  const undoTask = useCallback(
    (index) => {
      const task = userData.completedTasks[index];
      const taskIndex = userData.tasks.findIndex((t) => t.name === task.name);
      const originalTask = taskIndex !== -1 ? userData.tasks[taskIndex] : null;

      if (!task || !originalTask) return;

      const newCompletionCount = Math.max(task.completionCount - 1, 0);
      const newLifetimeCompletionCount = Math.max(
        originalTask.lifetimeCompletionCount - 1,
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

      const newCompletedTasks = [...userData.completedTasks];
      if (newDailyCounter > 0) {
        newCompletedTasks[index] = {
          ...task,
          completionCount: newCompletionCount,
          points: task.points - pointsToAdjust,
          dailyCounter: newDailyCounter,
          ...(task.hasTimesOption
            ? { times: Math.max((task.times || task.completionCount) - 1, 0) }
            : {}),
        };
      } else {
        newCompletedTasks.splice(index, 1);
      }

      const newTasks = userData.tasks.map((t, i) =>
        i === taskIndex
          ? {
              ...t,
              completionCount: Math.max(t.completionCount - 1, 0),
              lifetimeCompletionCount: newLifetimeCompletionCount,
              dailyCounter: newDailyCounter,
            }
          : t
      );

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

  const missTask = useCallback(
    (index) => {
      const task = userData.tasks[index];
      if (task.boost !== "DoubleOrDie") return;

      const newPointsData = {
        ...userData.points,
        current: Math.max(userData.points.current - 10, 0),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(userData.Mpoints.current - 10, 0),
      };
      updateLocalData({
        points: newPointsData,
        Mpoints: newMpointsData,
      });
      Swal.fire({
        icon: "warning",
        title: "Task Missed",
        text: `10 points deducted for missing "${task.name}".`,
      });
    },
    [userData, updateLocalData]
  );

  const adjustPoints = useCallback(
    (amount) => {
      const newPointsData = {
        ...userData.points,
        current: Math.max(userData.points.current + amount, 0),
      };
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(userData.Mpoints.current + amount, 0),
      };
      updateLocalData({
        points: newPointsData,
        Mpoints: newMpointsData,
      });
      Swal.fire({
        icon: "success",
        title: "Points Adjusted",
        text: `Points changed by ${amount > 0 ? "+" : ""}${amount}pts.`,
      });
    },
    [userData.points, userData.Mpoints, updateLocalData]
  );

  const adjustMonthlyPoints = useCallback(
    (amount) => {
      const newMpointsData = {
        ...userData.Mpoints,
        current: Math.max(userData.Mpoints.current + amount, 0),
      };
      updateLocalData({
        Mpoints: newMpointsData,
      });
      Swal.fire({
        icon: "success",
        title: "Monthly Points Adjusted",
        text: `Monthly points changed by ${amount > 0 ? "+" : ""}${amount}pts.`,
      });
    },
    [userData.Mpoints, updateLocalData]
  );

  const resetTaskCompletionCount = useCallback(
    (index) => {
      const task = userData.tasks[index];
      const updatedTasks = userData.tasks.map((t, i) =>
        i === index
          ? { ...t, completionCount: 0, dailyCounter: 0, bonusClaimed: false }
          : t
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
      taskMap.get(task.name)
        ? { ...task, dailyCounter: 0, bonusClaimed: false }
        : task
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
      bonusClaimed: false,
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
    if (!userId) {
      Swal.fire({
        icon: "error",
        title: "User Not Found",
        text: "User ID is missing. Please log in again.",
      });
      navigate("/login");
      return;
    }

    // Fetch the latest currentWeek from Firebase to avoid stale data
    let currentWeek;
    try {
      const weekSnap = await get(ref(database, `users/${userId}/currentWeek`));
      currentWeek = weekSnap.val() || 1;
    } catch (error) {
      console.error("Failed to fetch currentWeek:", error);
      currentWeek = userData.currentWeek || 1;
    }

    const newWeekNumber = currentWeek + 1;

    // Calculate weekly performance
    const weeklyPerformance = {};
    let totalWeeklyCompletion = 0;
    let totalPossible = 0;
    const taskPerformances = userData.tasks
      .filter((task) => task.category === "Task")
      .map((task) => {
        const weeklyTask = userData.completedTasks.find(
          (t) => t.name === task.name
        );
        const completionCount = weeklyTask?.completionCount || 0;
        const numberLimit = task.numberLimit || Infinity;
        const performance = numberLimit
          ? Math.round((completionCount / numberLimit) * 100)
          : 0;
        weeklyPerformance[task.taskId] = {
          name: task.name,
          performance,
          completionCount,
          numberLimit,
        };
        totalWeeklyCompletion += completionCount;
        totalPossible += numberLimit;
        return performance;
      });
    const overallWeeklyPerformance =
      totalPossible > 0
        ? Math.round((totalWeeklyCompletion / totalPossible) * 100)
        : 0;
    weeklyPerformance.overall = overallWeeklyPerformance;

    const weekArchive = {
      timestamp: Date.now(),
      weekNumber: currentWeek,
      completedTasks: [...userData.completedTasks],
      points: userData.points.current,
      Mpoints: userData.Mpoints.current,
      weeklyPerformance,
    };

    try {
      // Perform all Firebase updates in a single transaction
      const updates = {};
      updates[`users/${userId}/historicalCompletions/${currentWeek}`] =
        weekArchive.completedTasks.reduce((acc, task) => {
          acc[task.taskId] = task.completionCount || 0;
          return acc;
        }, {});
      updates[`users/${userId}/weeklyPerformance/${currentWeek}`] =
        weekArchive.weeklyPerformance;
      updates[`users/${userId}/currentWeek`] = newWeekNumber;
      updates[`users/${userId}/completedTasks`] = [];
      updates[`users/${userId}/tasks`] = userData.tasks.reduce((acc, task) => {
        acc[task.taskId] = {
          ...task,
          completionCount: 0,
          dailyCounter: 0,
          boost: null,
          hasTimesOption: task.hasTimesOption && task.boost !== "TheSavior",
          bonusClaimed: false,
        };
        return acc;
      }, {});
      updates[`users/${userId}/points`] = { current: 0, total: 800 };

      await update(ref(database), updates);

      // Update local state
      const resetTasks = userData.tasks.map((task) => ({
        ...task,
        completionCount: 0,
        dailyCounter: 0,
        boost: null,
        hasTimesOption: task.hasTimesOption && task.boost !== "TheSavior",
        bonusClaimed: false,
      }));
      updateLocalData({
        tasks: resetTasks,
        completedTasks: [],
        points: { current: 0, total: 800 },
        currentWeek: newWeekNumber,
      });

      // Trigger stats refresh
      localStorage.setItem("statsRefreshTimestamp", Date.now().toString());

      // Debugging: Log the transition
      console.log({
        message: `Started week ${newWeekNumber}`,
        userId,
        previousWeek: currentWeek,
        completedTasksCount: userData.completedTasks.length,
        archivedTasks: weekArchive.completedTasks,
      });

      Swal.fire({
        icon: "success",
        title: "New Week Started!",
        html: `<div><p>All counters and boosts reset. Week ${newWeekNumber} started.</p><small>Previous week's data archived for statistics.</small></div>`,
      });
    } catch (error) {
      console.error("Failed to start new week:", error);
      Swal.fire({
        icon: "error",
        title: "Week Start Failed",
        text: `Failed to start new week: ${error.message}. Your changes are saved locally.`,
      });
    }
  }, [userData, updateLocalData, userId, navigate]);

  const startTheDay = useCallback(() => {
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
        penalty += 10;
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

  const applyGlobalBoost = useCallback(
    async (taskId, boost) => {
      if (!taskId || !boost || !BOOSTS[boost]) {
        Swal.fire({
          icon: "warning",
          title: "Selection Required",
          text: "Please select a valid task and boost.",
        });
        return;
      }

      const task = globalTasks[taskId];
      if (!task) {
        Swal.fire({
          icon: "error",
          title: "Invalid Task",
          text: "The selected task is invalid.",
        });
        return;
      }

      const confirmResult = await Swal.fire({
        icon: "warning",
        title: "Apply Boost Globally?",
        text: `Apply "${boost}" to "${task.name}" for all eligible users?`,
        showCancelButton: true,
        confirmButtonText: "Apply",
      });

      if (!confirmResult.isConfirmed) return;

      try {
        Swal.fire({
          title: "Applying Boost...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const usersRef = ref(database, "users");
        const usersSnapshot = await get(usersRef);
        const usersData = usersSnapshot.val() || {};

        const updates = {};
        for (const userId of Object.keys(usersData)) {
          const userTasks = usersData[userId].tasks || {};
          if (userTasks[taskId] && userTasks[taskId].boost !== boost) {
            updates[`users/${userId}/tasks/${taskId}/boost`] = boost;
            if (boost === "TheSavior") {
              updates[`users/${userId}/tasks/${taskId}/hasTimesOption`] = true;
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates);
        }

        const adminTaskIndex = userData.tasks.findIndex(
          (t) => t.taskId === taskId
        );
        if (
          adminTaskIndex !== -1 &&
          userData.tasks[adminTaskIndex].boost !== boost
        ) {
          const updatedTasks = [...userData.tasks];
          updatedTasks[adminTaskIndex] = {
            ...updatedTasks[adminTaskIndex],
            boost,
            hasTimesOption:
              boost === "TheSavior"
                ? true
                : updatedTasks[adminTaskIndex].hasTimesOption,
          };
          updateLocalData({ tasks: updatedTasks });
        }

        Swal.fire({
          icon: "success",
          title: "Boost Applied",
          text: `"${boost}" applied to "${task.name}" for eligible users.`,
          timer: 2000,
        });
      } catch (error) {
        console.error("Global boost error:", error);
        Swal.fire({
          icon: "error",
          title: "Application Failed",
          text: `Failed to apply boost: ${error.message}`,
        });
      }
    },
    [globalTasks, userData.tasks, updateLocalData]
  );
  const startWeekForAllUsers = useCallback(async () => {
    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "Start Week for All Users?",
      text: "This will reset tasks, points, and boosts for all users, starting a new week. Historical completions will be archived. Continue?",
      showCancelButton: true,
      confirmButtonText: "Start Week",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      Swal.fire({
        title: "Starting Week for All Users...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const usersRef = ref(database, "users");
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.val() || {};

      const updates = {};
      const weekNumber = (userData.currentWeek || 1) + 1;

      for (const userId of Object.keys(usersData)) {
        const user = usersData[userId];
        const userTasks = user.tasks || {};
        const completedTasks = Array.isArray(user.completedTasks)
          ? user.completedTasks
          : [];

        // Archive historical completions
        const weekArchive = completedTasks.reduce((acc, task) => {
          acc[task.taskId] = task.completionCount || 0;
          return acc;
        }, {});
        updates[`users/${userId}/historicalCompletions/${weekNumber}`] =
          weekArchive;

        // Reset tasks
        const resetTasks = Object.fromEntries(
          Object.keys(userTasks).map((taskId) => [
            taskId,
            {
              ...userTasks[taskId],
              completionCount: 0,
              dailyCounter: 0,
              boost: null,
              hasTimesOption:
                userTasks[taskId].hasTimesOption &&
                userTasks[taskId].boost !== "TheSavior",
              bonusClaimed: false,
            },
          ])
        );

        // Update user data
        updates[`users/${userId}/tasks`] = resetTasks;
        updates[`users/${userId}/completedTasks`] = [];
        updates[`users/${userId}/points`] = { current: 0, total: 800 };
        updates[`users/${userId}/currentWeek`] = weekNumber;
      }

      // Apply updates to Firebase
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }

      // Update admin's local state
      const resetTasks = userData.tasks.map((task) => ({
        ...task,
        completionCount: 0,
        dailyCounter: 0,
        boost: null,
        hasTimesOption: task.hasTimesOption && task.boost !== "TheSavior",
        bonusClaimed: false,
      }));
      updateLocalData({
        tasks: resetTasks,
        completedTasks: [],
        points: { current: 0, total: 800 },
        currentWeek: weekNumber,
      });

      Swal.fire({
        icon: "success",
        title: "Week Started",
        text: `Week ${weekNumber} started for all users.`,
        timer: 2000,
      });
    } catch (error) {
      console.error("Start week for all users error:", error);
      Swal.fire({
        icon: "error",
        title: "Operation Failed",
        text: `Failed to start week: ${error.message}`,
      });
    }
  }, [userData, updateLocalData]);

  const sendGlobalNotification = useCallback(async () => {
    const inputResult = await Swal.fire({
      icon: "question",
      title: "Send Global Notification",
      text: "Enter the notification message to send to all users:",
      input: "text",
      inputPlaceholder: "e.g., Event tomorrow at 5 PM!",
      showCancelButton: true,
      confirmButtonText: "Send",
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return "Please enter a valid message";
        }
      },
    });

    if (!inputResult.isConfirmed) return;

    const message = inputResult.value.trim();
    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "Confirm Notification",
      text: `Send "${message}" to all users? It will appear as a notification modal.`,
      showCancelButton: true,
      confirmButtonText: "Send Notification",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      Swal.fire({
        title: "Sending Notification...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const notificationId = Date.now();
      const notification = {
        id: notificationId,
        message,
        timestamp: notificationId,
        global: true,
      };

      // Store in global notifications path
      await update(
        ref(database, `notifications/global/${notificationId}`),
        notification
      );

      // Update all users
      const usersRef = ref(database, "users");
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.val() || {};

      const updates = {};
      for (const userId of Object.keys(usersData)) {
        updates[`users/${userId}/notifications/${notificationId}`] =
          notification;
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }

      // Update admin's local notifications
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          message,
          global: true,
        },
      ]);

      Swal.fire({
        icon: "success",
        title: "Notification Sent",
        text: `"${message}" sent to all users.`,
        timer: 2000,
      });
    } catch (error) {
      console.error("Send global notification error:", error);
      Swal.fire({
        icon: "error",
        title: "Send Failed",
        text: `Failed to send notification: ${error.message}`,
      });
    }
  }, [setNotifications]);

  const submitFeedback = useCallback(async () => {
    if (auth.currentUser?.email === "admin@gmail.com") return;

    const inputResult = await Swal.fire({
      icon: "question",
      title: "Submit Feedback",
      text: "Share your suggestions, issues, or comments about the app:",
      input: "textarea",
      inputPlaceholder: "Type your feedback here...",
      showCancelButton: true,
      confirmButtonText: "Submit",
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return "Please enter a valid feedback message";
        }
      },
    });

    if (!inputResult.isConfirmed) return;

    const message = inputResult.value.trim();
    try {
      Swal.fire({
        title: "Submitting Feedback...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const feedbackId = Date.now();
      const feedback = {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        timestamp: feedbackId,
        message,
      };

      await update(ref(database, `feedback/${feedbackId}`), feedback);

      Swal.fire({
        icon: "success",
        title: "Feedback Submitted",
        text: "Thank you for your feedback!",
        timer: 2000,
      });
    } catch (error) {
      console.error("Submit feedback error:", error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: `Failed to submit feedback: ${error.message}`,
      });
    }
  }, []);

  const viewFeedback = useCallback(async () => {
    try {
      Swal.fire({
        title: "Fetching Feedback...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const feedbackRef = ref(database, "feedback");
      const feedbackSnapshot = await get(feedbackRef);
      const feedbackData = feedbackSnapshot.val() || {};

      if (Object.keys(feedbackData).length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Feedback",
          text: "No feedback has been submitted yet.",
          confirmButtonText: "OK",
        });
        return;
      }

      const feedbackList = Object.entries(feedbackData)
        .map(([id, feedback]) => {
          const date = new Date(feedback.timestamp).toLocaleDateString();
          return `<strong>From:</strong> ${feedback.email}<br><strong>Date:</strong> ${date}<br><strong>Message:</strong> ${feedback.message}<br><hr>`;
        })
        .join("");

      Swal.fire({
        icon: "info",
        title: "User Feedback",
        html: `<div style="text-align: left; max-height: 400px; overflow-y: auto;">${feedbackList}</div>`,
        confirmButtonText: "Close",
        width: "600px",
      });
    } catch (error) {
      console.error("View feedback error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load",
        text: `Failed to load feedback: ${error.message}`,
      });
    }
  }, []);

  const getProgressColor = (current, total) => {
    const percentage = (current / total) * 100;
    if (percentage >= 75) return "#28a745";
    if (percentage >= 25) return "#ffc107";
    return "#dc3545";
  };

  const toggleAchievements = () => setIsAchievementsOpen((prev) => !prev);
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    userData,
    notifications,
    openSections,
    isLoading,
    isSyncing,
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
    removeNotification,
    mode,
    switchMode,
    completeTask,
    missTask,
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
    claimBonus,
    adjustPoints,
    adjustMonthlyPoints,
    applyGlobalBoost,
    startWeekForAllUsers,
    sendGlobalNotification,
    submitFeedback,
    viewFeedback,
  };
};
