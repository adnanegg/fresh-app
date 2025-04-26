import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import {
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, get, update, remove } from "firebase/database";
import Swal from "sweetalert2";

const Dashboard = () => {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  const [userProfile, setUserProfile] = useState({ name: "" });
  const [pointsData, setPointsData] = useState({ current: 0, total: 800 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 2800 });
  const [achievementsData, setAchievementsData] = useState({});
  const [scoreFormData, setScoreFormData] = useState({
    timestamp: new Date().toLocaleTimeString(),
    nickname: "",
    score: "",
    message: "",
    BookP: "0%",
    QuoranP: "0%",
    PrayerP: "0%",
    SportP: "0%",
    QuranListenP: "0%",
    Improvement15minP: "0%",
    WakeUpEarlyP: "0%",
  });
  const [monthlyScoreFormData, setMonthlyScoreFormData] = useState({
    timestamp: new Date().toLocaleTimeString(),
    nickname: "",
    score: "",
    message: "",
    bronze: "0",
    silver: "0",
    gold: "0",
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);
  const [programLink, setProgramLink] = useState("/normal-mode");

  // Define performance goals for all tasks
  const taskGoals = {
    Book: 70,
    Quran: 70,
    Sport: 70,
    Prayer: 70,
    QuranListen: 70,
    Improvement: 70,
    WakeUp: 70,
  };

  useEffect(() => {
    setScoreFormData((prev) => ({
      ...prev,
      nickname: userProfile.name || "",
      score: pointsData.current.toString() || "",
      message: "",
      timestamp: new Date().toLocaleTimeString(),
    }));
  }, [userProfile, pointsData]);

  useEffect(() => {
    setMonthlyScoreFormData((prev) => ({
      ...prev,
      nickname: userProfile.name || "",
      score: MpointsData.current.toString() || "",
      message: "",
      bronze: Object.values(achievementsData)
        .filter((a) => a.star === "bronze")
        .length.toString(),
      silver: Object.values(achievementsData)
        .filter((a) => a.star === "silver")
        .length.toString(),
      gold: Object.values(achievementsData)
        .filter((a) => a.star === "gold")
        .length.toString(),
      timestamp: new Date().toLocaleTimeString(),
    }));
  }, [userProfile, MpointsData, achievementsData]);

  const fetchUserData = useCallback(async (userId) => {
    try {
      const queries = [
        get(ref(database, `users/${userId}/profile`)),
        get(ref(database, `users/${userId}/points`)),
        get(ref(database, `users/${userId}/Mpoints`)),
        get(ref(database, `users/${userId}/achievements`)),
        get(ref(database, `users/${userId}/tasks`)),
        get(ref(database, "globalTasks")),
      ];

      const [
        profileSnap,
        pointsSnap,
        mPointsSnap,
        achievementsSnap,
        tasksSnap,
        globalTasksSnap,
      ] = await Promise.all(queries);

      const firebaseData = {
        profile: profileSnap.val() || { name: "User" },
        points: pointsSnap.val() || { current: 0, total: 800 },
        Mpoints: mPointsSnap.val() || { current: 0, total: 2800 },
        achievements: achievementsSnap.val() || {},
        tasks: tasksSnap.val() || {},
        lastUpdated: Date.now(),
      };

      const globalTasks = globalTasksSnap.val() || {};

      setUserProfile(firebaseData.profile);
      setPointsData(firebaseData.points);
      setMpointsData(firebaseData.Mpoints);
      setAchievementsData(firebaseData.achievements);

      const taskPercentages = [
        "book_read",
        "quran_read",
        "prayer_mosque",
        "sport_exercise",
        "quran_listen",
        "improvement_15min",
        "wake_up_early",
      ].reduce((acc, taskId) => {
        const task = firebaseData.tasks[taskId] || {};
        const globalTask = globalTasks[taskId] || {};
        const percentage =
          globalTask.numberLimit > 0
            ? Math.round((task.completionCount / globalTask.numberLimit) * 100)
            : 0;
        return {
          ...acc,
          [taskId === "book_read"
            ? "BookP"
            : taskId === "quran_read"
            ? "QuoranP"
            : taskId === "prayer_mosque"
            ? "PrayerP"
            : taskId === "sport_exercise"
            ? "SportP"
            : taskId === "quran_listen"
            ? "QuranListenP"
            : taskId === "improvement_15min"
            ? "Improvement15minP"
            : "WakeUpEarlyP"]: `${percentage}%`,
        };
      }, {});

      setScoreFormData((prev) => ({
        ...prev,
        ...taskPercentages,
        nickname: firebaseData.profile.name,
        score: firebaseData.points.current.toString(),
        timestamp: new Date().toLocaleTimeString(),
      }));

      localStorage.setItem(`userData_${userId}`, JSON.stringify(firebaseData));
      localStorage.setItem("globalTasks", JSON.stringify(globalTasks));

      if (auth.currentUser?.email === "admin@gmail.com") {
        setIsAdmin(true);
      }
    } catch (firebaseError) {
      console.error("Firebase fetch failed, trying cache:", firebaseError);
      try {
        const cachedUserData =
          JSON.parse(localStorage.getItem(`userData_${userId}`)) || {};
        const cachedGlobalTasks =
          JSON.parse(localStorage.getItem("globalTasks")) || {};

        setUserProfile(cachedUserData.profile || { name: "User" });
        setPointsData(cachedUserData.points || { current: 0, total: 800 });
        setMpointsData(cachedUserData.Mpoints || { current: 0, total: 2800 });
        setAchievementsData(cachedUserData.achievements || {});

        const cachedTaskPercentages = [
          "book_read",
          "quran_read",
          "prayer_mosque",
          "sport_exercise",
          "quran_listen",
          "improvement_15min",
          "wake_up_early",
        ].reduce((acc, taskId) => {
          const task = cachedUserData.tasks?.[taskId] || {};
          const globalTask = cachedGlobalTasks[taskId] || {};
          const percentage =
            globalTask.numberLimit > 0
              ? Math.round(
                  (task.completionCount / globalTask.numberLimit) * 100
                )
              : 0;
          return {
            ...acc,
            [taskId === "book_read"
              ? "BookP"
              : taskId === "quran_read"
              ? "QuoranP"
              : taskId === "prayer_mosque"
              ? "PrayerP"
              : taskId === "sport_exercise"
              ? "SportP"
              : taskId === "quran_listen"
              ? "QuranListenP"
              : taskId === "improvement_15min"
              ? "Improvement15minP"
              : "WakeUpEarlyP"]: `${percentage}%`,
          };
        }, {});

        setScoreFormData((prev) => ({
          ...prev,
          ...cachedTaskPercentages,
          nickname: cachedUserData.profile?.name || "",
          score: cachedUserData.points?.current?.toString() || "0",
          timestamp: new Date().toLocaleTimeString(),
        }));

        Swal.fire({
          icon: "warning",
          title: "Using Cached Data",
          text: "Couldn't connect to server. Showing last saved data.",
        });
      } catch (cacheError) {
        console.error("Cache read failed:", cacheError);
        Swal.fire({
          icon: "error",
          title: "Data Load Failed",
          text: "Couldn't load data from server or cache.",
        });
      }
    }
  }, []);

  const syncWithFirebase = useCallback(async () => {
    if (!userId) return;
    try {
      const userRef = ref(database, `users/${userId}`);
      const updatedData = {
        profile: { name: userProfile.name },
        points: { ...pointsData },
        Mpoints: { ...MpointsData },
        lastUpdated: Date.now(),
      };
      await update(userRef, updatedData);
      setUserProfile({ name: userProfile.name });
      setPointsData({ ...pointsData });
      setMpointsData({ ...MpointsData });
      localStorage.setItem(`userData_${userId}`, JSON.stringify(updatedData));
    } catch (error) {
      console.error("Sync error:", error);
      Swal.fire({
        icon: "error",
        title: "Sync Failed",
        text: "Failed to sync changes with Firebase.",
      });
    }
  }, [userId, pointsData, MpointsData]);

  useEffect(() => {
    const fetchTrackerMode = async () => {
      try {
        const modeSnap = await get(
          ref(database, `users/${userId}/preferences/mode`)
        );
        const trackerMode = modeSnap.val() || "weekly";
        setProgramLink(
          trackerMode === "daily" ? "/normal-mode" : "/weekly-mode"
        );
      } catch (error) {
        console.error("Failed to fetch tracker mode:", error);
        setProgramLink("/weekly-mode");
      }
    };
    if (userId) {
      fetchTrackerMode();
    }
  }, [userId]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) navigate("/login");
      else fetchUserData(user.uid);
    });
    return () => unsubscribeAuth();
  }, [navigate, fetchUserData]);

  const submitAllUserForms = async () => {
    try {
      Swal.fire({
        title: "Processing...",
        html: "Submitting all user weekly data",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const usersSnapshot = await get(ref(database, "users"));
      if (!usersSnapshot.exists()) {
        Swal.fire("No users found");
        return;
      }
      const users = usersSnapshot.val();
      const userIds = Object.keys(users).filter(
        (userId) => users[userId].profile && users[userId].points
      );
      const globalTasksSnap = await get(ref(database, "globalTasks"));
      const globalTasks = globalTasksSnap.val() || {};
      let successCount = 0,
        errorCount = 0;
      for (const userId of userIds) {
        try {
          const tasks = users[userId].tasks || {};
          const taskPercentages = [
            "book_read",
            "quran_read",
            "prayer_mosque",
            "sport_exercise",
            "quran_listen",
            "improvement_15min",
            "wake_up_early",
          ].reduce((acc, taskId) => {
            const task = tasks[taskId] || {};
            const globalTask = globalTasks[taskId] || {};
            const percentage =
              globalTask.numberLimit > 0
                ? Math.round(
                    (task.completionCount / globalTask.numberLimit) * 100
                  )
                : 0;
            return {
              ...acc,
              [taskId === "book_read"
                ? "BookP"
                : taskId === "quran_read"
                ? "QuoranP"
                : taskId === "prayer_mosque"
                ? "PrayerP"
                : taskId === "sport_exercise"
                ? "SportP"
                : taskId === "quran_listen"
                ? "QuranListenP"
                : taskId === "improvement_15min"
                ? "Improvement15minP"
                : "WakeUpEarlyP"]: `${percentage}%`,
            };
          }, {});

          const formData = new FormData();
          formData.append("Time", new Date().toLocaleTimeString());
          formData.append("Nickname", users[userId].profile.name || "User");
          formData.append(
            "Score",
            users[userId].points.current.toString() || "0"
          );
          formData.append("Message", "Admin-submitted");
          formData.append("BookP", taskPercentages.BookP || "0%");
          formData.append("QuoranP", taskPercentages.QuoranP || "0%");
          formData.append("PrayerP", taskPercentages.PrayerP || "0%");
          formData.append("SportP", taskPercentages.SportP || "0%");
          formData.append("QuranListenP", taskPercentages.QuranListenP || "0%");
          formData.append(
            "Improvement15minP",
            taskPercentages.Improvement15minP || "0%"
          );
          formData.append("WakeUpEarlyP", taskPercentages.WakeUpEarlyP || "0%");

          console.log(
            `Weekly formData for ${userId}:`,
            Object.fromEntries(formData)
          );

          const response = await fetch(
            "https://script.google.com/macros/s/AKfycbzOctGECippPoRgLhx-r8urusRpDfniFctGYgv-m7FG_LKDjIKbqPw7n6GTFE1jK8X4/exec",
            { method: "POST", body: formData }
          );
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(
              `Failed to submit weekly for user ${userId}: ${response.status}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          errorCount++;
          console.error(`Error submitting weekly for user ${userId}:`, error);
        }
      }
      Swal.fire({
        icon: "success",
        title: "Weekly Submission Complete",
        html: `<div style="text-align: left;"><p><strong>Total users processed:</strong> ${userIds.length}</p><p><strong>Successful submissions:</strong> ${successCount}</p><p><strong>Failed submissions:</strong> ${errorCount}</p></div>`,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Weekly submission error:", error);
      Swal.fire({
        icon: "error",
        title: "Weekly Submission Failed",
        text: error.message || "Error starting the submission process",
      });
    }
  };

  const submitAllUserMonthlyForms = async () => {
    try {
      Swal.fire({
        title: "Processing...",
        html: "Submitting all user monthly data",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const usersSnapshot = await get(ref(database, "users"));
      if (!usersSnapshot.exists()) {
        Swal.fire("No users found");
        return;
      }
      const users = usersSnapshot.val();
      const userIds = Object.keys(users).filter(
        (userId) => users[userId].profile && users[userId].Mpoints
      );
      let successCount = 0,
        errorCount = 0;
      for (const userId of userIds) {
        try {
          const achievements = users[userId].achievements || {};
          const formData = new FormData();
          formData.append("Timing", new Date().toLocaleTimeString());
          formData.append("Name", users[userId].profile.name || "User");
          formData.append(
            "Mscore",
            users[userId].Mpoints.current.toString() || "0"
          );
          formData.append("Mess", "Admin-submitted");
          formData.append(
            "Bronze",
            Object.values(achievements)
              .filter((a) => a.star === "bronze")
              .length.toString() || "0"
          );
          formData.append(
            "Silver",
            Object.values(achievements)
              .filter((a) => a.star === "silver")
              .length.toString() || "0"
          );
          formData.append(
            "Gold",
            Object.values(achievements)
              .filter((a) => a.star === "gold")
              .length.toString() || "0"
          );

          console.log(
            `Monthly formData for ${userId}:`,
            Object.fromEntries(formData)
          );

          const response = await fetch(
            "https://script.google.com/macros/s/AKfycbxbdUof2Sj7sPXUjHmNaFK2Fn8D3aENPAqe5GKH_5d1KoSrKZh8HdOHOMw0dIN4sFS-tQ/exec",
            { method: "POST", body: formData }
          );
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(
              `Failed to submit monthly for user ${userId}: ${response.status}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          errorCount++;
          console.error(`Error submitting monthly for user ${userId}:`, error);
        }
      }
      Swal.fire({
        icon: "success",
        title: "Monthly Submission Complete",
        html: `<div style="text-align: left;"><p><strong>Total users processed:</strong> ${userIds.length}</p><p><strong>Successful submissions:</strong> ${successCount}</p><p><strong>Failed submissions:</strong> ${errorCount}</p></div>`,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Monthly submission error:", error);
      Swal.fire({
        icon: "error",
        title: "Monthly Submission Failed",
        text: error.message || "Error starting the submission process",
      });
    }
  };

  const handleDeleteAccount = useCallback(async () => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "This will permanently delete your account and all associated data. This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete my account",
      });

      if (result.isConfirmed) {
        const user = auth.currentUser;
        if (!user || !userId) throw new Error("No user is currently logged in");

        Swal.fire({
          title: "Deleting Account...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);
        await deleteUser(user);
        localStorage.removeItem(`userData_${userId}`);
        localStorage.removeItem("trackerMode");

        await Swal.fire({
          icon: "success",
          title: "Account Deleted",
          text: "Your account has been successfully deleted.",
          timer: 2000,
          showConfirmButton: false,
        });
        navigate("/login");
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      if (error.code === "auth/requires-recent-login") {
        const { value: credentials } = await Swal.fire({
          title: "Re-authentication Required",
          text: "Please enter your email and password to confirm account deletion.",
          html:
            '<input id="swal-input-email" class="swal2-input" placeholder="Email" type="email">' +
            '<input id="swal-input-password" class="swal2-input" placeholder="Password" type="password">',
          focusConfirm: false,
          preConfirm: () => {
            const email = document.getElementById("swal-input-email").value;
            const password = document.getElementById(
              "swal-input-password"
            ).value;
            if (!email || !password) {
              Swal.showValidationMessage("Email and password are required");
              return false;
            }
            return { email, password };
          },
          showCancelButton: true,
          confirmButtonText: "Confirm",
          cancelButtonText: "Cancel",
        });

        if (credentials) {
          try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(
              credentials.email,
              credentials.password
            );
            await reauthenticateWithCredential(user, credential);

            Swal.fire({
              title: "Deleting Account...",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            const userRef = ref(database, `users/${userId}`);
            await remove(userRef);
            await deleteUser(user);
            localStorage.removeItem(`userData_${userId}`);
            localStorage.removeItem("trackerMode");

            await Swal.fire({
              icon: "success",
              title: "Account Deleted",
              text: "Your account has been successfully deleted.",
              timer: 2000,
              showConfirmButton: false,
            });
            navigate("/login");
          } catch (reauthError) {
            console.error("Re-authentication error:", reauthError);
            Swal.fire({
              icon: "error",
              title: "Authentication Failed",
              text: "Invalid email or password. Please try again.",
            });
          }
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Deletion Failed",
          text:
            error.message || "Failed to delete your account. Please try again.",
        });
      }
    }
  }, [userId, navigate]);

  const resetPointsBar = useCallback(async () => {
    const newPointsData = { current: 0, total: 800 };
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      setPointsData(newPointsData);
      await update(userRef, { points: newPointsData });
      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify({
          ...JSON.parse(localStorage.getItem(`userData_${userId}`) || "{}"),
          points: newPointsData,
          lastUpdated: Date.now(),
        })
      );
      Swal.fire({
        icon: "success",
        title: "Points Bar Reset!",
        text: "The points bar has been reset to 0.",
      });
    }
  }, [userId]);

  const resetMonthlyPointsBar = useCallback(async () => {
    const newMpointsData = { current: 0, total: 2800 };
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      setMpointsData(newMpointsData);
      await update(userRef, { Mpoints: newMpointsData });
      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify({
          ...JSON.parse(localStorage.getItem(`userData_${userId}`) || "{}"),
          Mpoints: newMpointsData,
          lastUpdated: Date.now(),
        })
      );
      Swal.fire({
        icon: "success",
        title: "Monthly Points Bar Reset!",
        text: "The Monthly points bar has been reset to 0.",
      });
    }
  }, [userId]);

  const handleLogout = useCallback(async () => {
    await syncWithFirebase();
    await signOut(auth);
    localStorage.removeItem(`userData_${userId}`);
    navigate("/login");
  }, [navigate, syncWithFirebase, userId]);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleNameChange = async () => {
    if (tempName.trim() === "") {
      Swal.fire({
        icon: "error",
        title: "Invalid Name",
        text: "Name cannot be empty",
      });
      return;
    }

    try {
      const cachedUserData =
        JSON.parse(localStorage.getItem(`userData_${userId}`)) || {};
      const updatedCachedData = {
        ...cachedUserData,
        profile: { ...cachedUserData.profile, name: tempName },
        lastUpdated: Date.now(),
      };
      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify(updatedCachedData)
      );

      setUserProfile({ name: tempName });

      const userRef = ref(database, `users/${userId}/profile`);
      const updatedProfile = { name: tempName };
      await update(userRef, updatedProfile);

      setIsEditingName(false);
      Swal.fire({
        icon: "success",
        title: "Name Updated",
        text: "Your name has been successfully updated!",
      });
    } catch (error) {
      console.error("Name update error:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Could not update your name.",
      });
    }
  };

  const styles = {
    containerFluid: { padding: 0, overflow: "hidden" },
    logo: { width: "32px", height: "32px", marginRight: "8px" },
    topBar: {
      position: "fixed",
      top: 0,
      width: "100%",
      height: "60px",
      backgroundColor: "#ffc107",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px",
      zIndex: 1000,
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    topBarLink: {
      textDecoration: "none",
      color: "#666",
      fontSize: "16px",
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      transition: "color 0.3s ease",
    },
    dashboardContent: {
      marginTop: "70px",
      padding: "10px",
      transition: "none",
      flex: 1,
    },
    dashboardCard: {
      borderRadius: "8px",
      background: "none",
      border: "none",
      marginBottom: "15px",
    },
    cardBody: { padding: "10px" },
    cardTitle: { fontSize: "14px", fontWeight: 600 },
    pointsProgress: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #007bff)",
      transition: "background 0.3s ease, transform 0.3s ease",
      position: "relative",
      overflow: "hidden",
    },
    monthlyPointsProgress: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #ff6b6b, #ffc107)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      transition: "background 0.3s ease, transform 0.3s ease",
      position: "relative",
      overflow: "hidden",
    },
    progressText: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "white",
      textShadow: "1px 1px 3px rgba(0, 0, 0, 0.3)",
      marginBottom: "10px",
    },
    progressIcon: {
      fontSize: "24px",
      marginBottom: "10px",
      animation: "pulse 2s infinite ease-in-out",
    },
    scoreFormCard: {
      borderRadius: "12px",
      background:
        "url('https://www.transparenttextures.com/patterns/parchment.jpg')",
      border: "2px solid #d4a017",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: "20px",
      marginTop: "10px",
      width: "100%",
      maxWidth: "100%",
      position: "relative",
      overflow: "hidden",
    },
    scoreFormTitle: {
      fontSize: "22px",
      fontWeight: "bold",
      color: "#d4a017",
      marginBottom: "20px",
      textAlign: "center",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
      fontFamily: "'MedievalSharp', cursive",
    },
    taskProgressContainer: {
      marginBottom: "15px",
    },
    taskProgressBar: {
      height: "20px",
      backgroundColor: "#e9ecef",
      borderRadius: "4px",
      overflow: "hidden",
      position: "relative",
    },
    taskProgressFill: {
      height: "100%",
      transition: "width 0.3s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingRight: "5px",
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
    },
    taskGoalMarker: {
      position: "absolute",
      height: "100%",
      width: "2px",
      backgroundColor: "rgba(0,0,0,0.7)",
      zIndex: 2,
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
    navBar: {
      position: "fixed",
      top: "0",
      width: "100%",
      background: "#ffc107",
      padding: "0.5rem 1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 1000,
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    },
    navBrand: { display: "flex", alignItems: "center" },
    navLogo: { width: "32px", height: "32px", marginRight: "8px" },
    navTitle: { fontWeight: "bold", fontSize: "18px", color: "#333" },
    hamburgerMenu: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-around",
      width: "30px",
      height: "24px",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "0",
      zIndex: "10",
    },
    hamburgerLine: {
      width: "30px",
      height: "3px",
      background: "#333",
      borderRadius: "10px",
      transition: "all 0.3s linear",
    },
    mobileMenu: {
      position: "fixed",
      top: "60px",
      right: "0",
      width: "220px",
      height: "calc(100% - 60px)",
      backgroundColor: "#fff",
      boxShadow: "-4px 0 8px rgba(0, 0, 0, 0.1)",
      transition: "transform 0.3s ease-in-out",
      transform: mobileMenuOpen ? "translateX(0)" : "translateX(100%)",
      zIndex: "999",
      display: "flex",
      flexDirection: "column",
      padding: "20px 0",
    },
    mobileNavLink: {
      padding: "12px 20px",
      textDecoration: "none",
      color: "#333",
      fontSize: "16px",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
    },
    navIcon: { marginRight: "10px", fontSize: "18px" },
    logoutButton: {
      margin: "10px 20px",
      padding: "10px",
      background: "#dc3545",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    resetButton: {
      width: "100%",
      padding: "8px",
      fontSize: "14px",
      marginTop: "8px",
    },
    nameEditInput: {
      width: "100%",
      padding: "5px",
      marginBottom: "10px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "14px",
    },
    nameEditButton: {
      padding: "5px 10px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      marginRight: "5px",
    },
    nameCancelButton: {
      padding: "5px 10px",
      backgroundColor: "#dc3545",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    },
    readyUsersCard: {
      textAlign: "center",
      padding: "15px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #28a745, #007bff)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      transition: "background 0.3s ease, transform 0.3s ease",
      position: "relative",
      overflow: "hidden",
    },
  };

  const stylesString = `
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    @keyframes glow { 0% { box-shadow: 0 0 5px #ffd700; } 50% { box-shadow: 0 0 15px #ffd700; } 100% { box-shadow: 0 0 5px #ffd700; } }
    .score-form-input:focus { border-color: #ffd700; transform: scale(1.02); }
    .score-form-submit:hover { transform: scale(1.05); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3); }
    .score-form-submit:active { transform: scale(0.98); }
    @media (max-width: 768px) { 
      .container-fluid { padding: 0; overflow-x: hidden; } 
      .row { margin-right: 0; margin-left: 0; } 
      .col-12 { padding-right: 10px; padding-left: 10px; } 
    }
  `;

  const getProgressColor = (current, total) => {
    const percentage = (current / total) * 100;
    if (percentage >= 75) return "#28a745";
    if (percentage >= 25) return "#ffc107";
    return "#dc3545";
  };

  return (
    <div style={styles.containerFluid}>
      <video autoPlay loop muted style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={styles.videoOverlay}></div>
      <style>{stylesString}</style>

      <nav style={styles.navBar}>
        <div style={styles.navBrand}>
          <img src="/trackerLogo.png" alt="Logo" style={styles.navLogo} />
          <span style={styles.navTitle}>Dashboard</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginRight: "50px",
          }}
        >
          <Link to={programLink} className="nav-link">
            <i className="bi bi-star-fill"></i> Program
          </Link>
          {isAdmin && (
            <Link to="/admin-scores" className="nav-link">
              <i className="bi bi-bar-chart-fill"></i> Admin Scores
            </Link>
          )}
        </div>
        <button
          style={styles.hamburgerMenu}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <div style={styles.hamburgerLine}></div>
          <div style={styles.hamburgerLine}></div>
          <div style={styles.hamburgerLine}></div>
        </button>
      </nav>

      <div style={styles.mobileMenu}>
        <div style={styles.profileSection}>
          <div style={styles.profileInfo}>
            <p style={styles.profileName}>{userProfile.name}</p>
            <p style={styles.userId}>
              ID: {auth.currentUser?.uid?.slice(0, 8)}...
            </p>
          </div>
        </div>
        <Link to="/profile" style={styles.mobileNavLink}>
          <i className="bi bi-person-fill" style={styles.navIcon}></i> Profile
        </Link>
        <Link to="/statistics" style={styles.mobileNavLink}>
          <i className="bi bi-bar-chart-fill" style={styles.navIcon}></i>{" "}
          Statistics
        </Link>
        {isAdmin && (
          <Link to="/admin-scores" style={styles.mobileNavLink}>
            <i className="bi bi-bar-chart-fill" style={styles.navIcon}></i>{" "}
            Admin Scores
          </Link>
        )}
        <button onClick={handleLogout} style={styles.logoutButton}>
          <i className="bi bi-box-arrow-right" style={styles.navIcon}></i>{" "}
          Logout
        </button>
      </div>

      <div style={styles.dashboardContent} className="container-fluid">
        {isAdmin && (
          <div className="mb-4">
            <button
              onClick={submitAllUserForms}
              className="btn btn-danger w-100 mb-2"
              style={{ padding: "10px", position: "relative", zIndex: 100 }}
            >
              <i className="bi bi-send-fill me-2"></i>Submit All Weekly Data
            </button>
            <button
              onClick={submitAllUserMonthlyForms}
              className="btn btn-danger w-100"
              style={{ padding: "10px", position: "relative", zIndex: 100 }}
            >
              <i className="bi bi-send-fill me-2"></i>Submit All Monthly Data
            </button>
          </div>
        )}

        <div className="row mb-4">
          <div className="col-12 col-md-6 mb-3 mb-md-0">
            <div style={styles.dashboardCard} className="card shadow-sm">
              <div style={styles.cardBody} className="text-center p-3">
                {isEditingName ? (
                  <div>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      style={styles.nameEditInput}
                    />
                    <button
                      onClick={handleNameChange}
                      style={styles.nameEditButton}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setTempName(userProfile.name);
                      }}
                      style={styles.nameCancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h4
                      style={styles.cardTitle}
                      className="text-dark fw-bold mb-1"
                    >
                      {userProfile.name}
                    </h4>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="btn btn-sm btn-outline-primary mt-2"
                    >
                      Edit Name
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="btn btn-sm btn-outline-danger mt-2 mx-2"
                    >
                      <i className="bi bi-trash-fill me-1"></i>Delete Account
                    </button>
                  </>
                )}
                <p className="text-muted small">
                  User ID: {auth.currentUser?.uid?.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-12 col-md-4 mb-3 mb-md-0">
            <div style={styles.dashboardCard} className="card shadow-sm">
              <div
                style={styles.cardBody}
                className="p-3 text-center"
                id="points-progress"
              >
                <h6
                  style={styles.cardTitle}
                  className="card-title text-primary mb-2"
                >
                  Points Progress
                </h6>
                <div style={styles.pointsProgress}>
                  <i
                    className="bi bi-star-fill"
                    style={{
                      ...styles.progressIcon,
                      color: getProgressColor(
                        pointsData.current,
                        pointsData.total
                      ),
                    }}
                  />
                  <p style={styles.progressText}>
                    {pointsData.current} / {pointsData.total} pts
                  </p>
                  <button
                    onClick={resetPointsBar}
                    className="btn btn-warning btn-sm mt-2 w-100"
                  >
                    Reset Points
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div style={styles.dashboardCard} className="card shadow-sm">
              <div style={styles.cardBody} className="p-3 text-center">
                <h6
                  style={styles.cardTitle}
                  className="card-title text-primary mb-2"
                >
                  Monthly Points Progress
                </h6>
                <div style={styles.monthlyPointsProgress}>
                  <i
                    className="bi bi-trophy-fill"
                    style={{
                      ...styles.progressIcon,
                      color: getProgressColor(
                        MpointsData.current,
                        MpointsData.total
                      ),
                    }}
                  />
                  <p style={styles.progressText}>
                    {MpointsData.current} / {MpointsData.total} pts
                  </p>
                  <button
                    onClick={resetMonthlyPointsBar}
                    className="btn btn-warning btn-sm mt-2 w-100"
                  >
                    Reset Monthly Points
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12 col-md-6 mb-3">
            <div style={styles.scoreFormCard} className="card shadow-sm">
              <div style={styles.cardBody} className="p-3">
                <h3 style={styles.scoreFormTitle}>Weekly Performance Goals</h3>
                {[
                  { name: "Book", key: "BookP", color: "#28a745" },
                  { name: "Quran", key: "QuoranP", color: "#17a2b8" },
                  { name: "Prayer", key: "PrayerP", color: "#6f42c1" },
                  { name: "Sport", key: "SportP", color: "#fd7e14" },
                  {
                    name: "Quran Listen",
                    key: "QuranListenP",
                    color: "#20c997",
                  },
                  {
                    name: "Improvement",
                    key: "Improvement15minP",
                    color: "#e83e8c",
                  },
                  { name: "Wake Up", key: "WakeUpEarlyP", color: "#6c757d" },
                ].map((task) => {
                  const percentage = parseFloat(
                    scoreFormData[task.key]?.replace("%", "") || 0
                  );
                  const goal = taskGoals[task.name];

                  return (
                    <div key={task.name} style={styles.taskProgressContainer}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>{task.name}</span>
                        <span>
                          {percentage.toFixed(1)}% / {goal}%
                        </span>
                      </div>
                      <div style={styles.taskProgressBar}>
                        <div
                          style={{
                            ...styles.taskProgressFill,
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: task.color,
                          }}
                        >
                          {percentage > 10 ? `${percentage.toFixed(1)}%` : ""}
                        </div>
                        {percentage <= 10 && (
                          <span
                            style={{
                              position: "absolute",
                              left: "5px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#495057",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        )}
                        <div
                          style={{
                            ...styles.taskGoalMarker,
                            left: `${goal}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 mb-3">
            <div style={styles.scoreFormCard} className="card shadow-sm">
              <div style={styles.cardBody} className="p-3">
                <h3 style={styles.scoreFormTitle}>Achievements</h3>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "15px",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(205, 127, 50, 0.1)",
                    }}
                  >
                    <i
                      className="bi bi-star-fill"
                      style={{
                        marginRight: "10px",
                        color: "#cd7f32",
                        fontSize: "20px",
                      }}
                    ></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>Bronze</div>
                      <div>{monthlyScoreFormData.bronze} achievements</div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "15px",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(192, 192, 192, 0.1)",
                    }}
                  >
                    <i
                      className="bi bi-star-fill"
                      style={{
                        marginRight: "10px",
                        color: "#c0c0c0",
                        fontSize: "20px",
                      }}
                    ></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>Silver</div>
                      <div>{monthlyScoreFormData.silver} achievements</div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                    }}
                  >
                    <i
                      className="bi bi-star-fill"
                      style={{
                        marginRight: "10px",
                        color: "#ffd700",
                        fontSize: "20px",
                      }}
                    ></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>Gold</div>
                      <div>{monthlyScoreFormData.gold} achievements</div>
                    </div>
                  </div>
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
