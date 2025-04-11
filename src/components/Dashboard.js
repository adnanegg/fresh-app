import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut, deleteUser } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, get, update, remove } from "firebase/database";
import Swal from "sweetalert2";

const Dashboard = () => {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  const [isVisible, setIsVisible] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: "" });
  const [pointsData, setPointsData] = useState({ current: 0, total: 800 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 2800 });
  const [achievementsData, setAchievementsData] = useState({});
  const [scoreFormData, setScoreFormData] = useState({
    timestamp: new Date().toLocaleTimeString(),
    nickname: "",
    score: "",
    message: "",
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
      const [profileSnap, pointsSnap, mPointsSnap, achievementsSnap] =
        await Promise.all([
          get(ref(database, `users/${userId}/profile`)),
          get(ref(database, `users/${userId}/points`)),
          get(ref(database, `users/${userId}/Mpoints`)),
          get(ref(database, `users/${userId}/achievements`)),
        ]);

      const profileData = profileSnap.val() || { name: "User" };
      const points = pointsSnap.val() || { current: 0, total: 800 };
      const mpoints = mPointsSnap.val() || { current: 0, total: 2800 };
      const achievements = achievementsSnap.val() || {};

      setUserProfile((prev) => {
        if (prev.name !== profileData.name) {
          return profileData;
        }
        return prev;
      });

      setPointsData((prev) => {
        if (prev.current !== points.current || prev.total !== points.total) {
          return points;
        }
        return prev;
      });

      setMpointsData((prev) => {
        if (prev.current !== mpoints.current || prev.total !== mpoints.total) {
          return mpoints;
        }
        return prev;
      });

      setAchievementsData((prev) => {
        const prevAchievements = JSON.stringify(prev);
        const newAchievements = JSON.stringify(achievements);
        if (prevAchievements !== newAchievements) {
          return achievements;
        }
        return prev;
      });

      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify({
          profile: profileData,
          points: points,
          Mpoints: mpoints,
          achievements: achievements,
          lastUpdated: Date.now(),
        })
      );

      if (auth.currentUser?.email === "admin@gmail.com") {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Failed",
        text: "Could not load dashboard data.",
      });
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
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) navigate("/login");
      else fetchUserData(user.uid);
    });
    return () => unsubscribeAuth();
  }, [navigate, fetchUserData]);

  const submitAllUserMonthlyForms = async () => {
    try {
      Swal.fire({
        title: "Processing...",
        html: "Submitting all user monthly forms",
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
          formData.append("Mscore", users[userId].Mpoints.current || 0);
          formData.append("Mess", "Auto-submitted monthly by admin");
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

          const response = await fetch(
            "https://script.google.com/macros/s/AKfycbxbdUof2Sj7sPXUjHmNaFK2Fn8D3aENPAqe5GKH_5d1KoSrKZh8HdOHOMw0dIN4sFS-tQ/exec",
            { method: "POST", body: formData }
          );
          if (response.ok) successCount++;
          else {
            errorCount++;
            console.error(`Failed to submit monthly for user ${userId}`);
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
        text: error.message || "Error starting the monthly submission process",
      });
    }
  };

  const submitAllUserForms = async () => {
    try {
      Swal.fire({
        title: "Processing...",
        html: "Submitting all user forms",
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
      let successCount = 0,
        errorCount = 0;
      for (const userId of userIds) {
        try {
          const formData = new FormData();
          formData.append("Time", new Date().toLocaleTimeString());
          formData.append("Nickname", users[userId].profile.name || "User");
          formData.append("Score", users[userId].points.current || 0);
          formData.append("Message", "Auto-submitted by admin");
          const response = await fetch(
            "https://script.google.com/macros/s/AKfycbxbPwffOvyWQjdN8smVC8frGxXqPggXd2Ea1L8tQ4NTWGDwq8EFNEmdLoOOu11qCNv8/exec",
            { method: "POST", body: formData }
          );
          if (response.ok) successCount++;
          else {
            errorCount++;
            console.error(`Failed to submit for user ${userId}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          errorCount++;
          console.error(`Error submitting for user ${userId}:`, error);
        }
      }
      Swal.fire({
        icon: "success",
        title: "Submission Complete",
        html: `<div style="text-align: left;"><p><strong>Total users processed:</strong> ${userIds.length}</p><p><strong>Successful submissions:</strong> ${successCount}</p><p><strong>Failed submissions:</strong> ${errorCount}</p></div>`,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Submission error:", error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
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
      Swal.fire({
        icon: "error",
        title: "Deletion Failed",
        text:
          error.message || "Failed to delete your account. Please try again.",
      });
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
    const userRef = ref(database, `users/${userId}/profile`);
    const updatedProfile = { name: tempName };
    try {
      await update(userRef, updatedProfile);
      setUserProfile(updatedProfile);
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

  const handleFieldUpdate = (field, value) => {
    setScoreFormData((prev) => ({
      ...prev,
      [field]: value,
      timestamp: new Date().toLocaleTimeString(),
    }));
  };

  const handleFieldMonthlyUpdate = (field, value) => {
    setMonthlyScoreFormData((prev) => ({
      ...prev,
      [field]: value,
      timestamp: new Date().toLocaleTimeString(),
    }));
  };

  const Submit = (e) => {
    e.preventDefault();
    const formEle = e.target;
    const formDatab = new FormData(formEle);
    formDatab.set("Time", new Date().toLocaleTimeString());
    fetch(
      "https://script.google.com/macros/s/AKfycbxbPwffOvyWQjdN8smVC8frGxXqPggXd2Ea1L8tQ4NTWGDwq8EFNEmdLoOOu11qCNv8/exec",
      { method: "POST", body: formDatab }
    )
      .then((res) => res.text())
      .then((data) => {
        Swal.fire({
          icon: "success",
          title: "Submission Successful!",
          text: "Your weekly score has been submitted.",
        });
        setScoreFormData((prev) => ({ ...prev, message: "" }));
      })
      .catch((error) => {
        console.error("Weekly submission error:", error);
        Swal.fire({
          icon: "error",
          title: "Submission Failed",
          text: "There was an error submitting your weekly score.",
        });
      });
  };

  const SubmitMonthly = (e) => {
    e.preventDefault();
    const formEle = e.target;
    const formDatab = new FormData(formEle);
    formDatab.set("Timing", new Date().toLocaleTimeString());
    formDatab.set("Name", monthlyScoreFormData.nickname);
    formDatab.set("Mscore", monthlyScoreFormData.score);
    formDatab.set("Mess", monthlyScoreFormData.message);
    formDatab.set("Bronze", monthlyScoreFormData.bronze);
    formDatab.set("Silver", monthlyScoreFormData.silver);
    formDatab.set("Gold", monthlyScoreFormData.gold);
    fetch(
      "https://script.google.com/macros/s/AKfycbxbdUof2Sj7sPXUjHmNaFK2Fn8D3aENPAqe5GKH_5d1KoSrKZh8HdOHOMw0dIN4sFS-tQ/exec",
      { method: "POST", body: formDatab }
    )
      .then((res) => res.text())
      .then((data) => {
        Swal.fire({
          icon: "success",
          title: "Submission Successful!",
          text: "Your monthly score has been submitted.",
        });
        setMonthlyScoreFormData((prev) => ({ ...prev, message: "" }));
      })
      .catch((error) => {
        console.error("Monthly submission error:", error);
        Swal.fire({
          icon: "error",
          title: "Submission Failed",
          text: "There was an error submitting your monthly score.",
        });
      });
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
    scoreFormInputWrapper: {
      position: "relative",
      marginBottom: "15px",
    },
    scoreFormInput: {
      width: "100%",
      padding: "12px 12px 12px 40px",
      borderRadius: "8px",
      border: "1px solid #b8860b",
      backgroundColor: "rgba(255, 245, 220, 0.9)",
      fontSize: "16px",
      color: "#333",
      boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.1)",
      transition: "border-color 0.3s ease, transform 0.2s ease",
    },
    scoreFormInputIcon: {
      position: "absolute",
      left: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#b8860b",
      fontSize: "18px",
    },
    scoreFormSubmit: {
      width: "100%",
      padding: "12px",
      background: "linear-gradient(135deg, #ffd700, #b8860b)",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "18px",
      fontWeight: "bold",
      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.3)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      display: isVisible ? "block" : "none",
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
          <Link
            to="/normal-mode"
            style={{
              ...styles.topBarLink,
              backgroundColor: "#28a745",
              color: "#fff",
              padding: "1px 12px",
              borderRadius: "6px",
            }}
          >
            Program
          </Link>
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
              <i className="bi bi-send-fill me-2"></i>Submit All Weekly Forms
            </button>
            <button
              onClick={submitAllUserMonthlyForms}
              className="btn btn-danger w-100"
              style={{ padding: "10px", position: "relative", zIndex: 100 }}
            >
              <i className="bi bi-send-fill me-2"></i>Submit All Monthly Forms
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
                <h3 style={styles.scoreFormTitle}>Weekly Score</h3>
                <form className="form" onSubmit={Submit}>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-clock-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Time of Submission"
                      name="Time"
                      type="text"
                      value={scoreFormData.timestamp}
                      readOnly
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-person-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Your Nickname"
                      name="Nickname"
                      type="text"
                      value={scoreFormData.nickname}
                      onChange={(e) =>
                        handleFieldUpdate("nickname", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-star-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Your Score"
                      name="Score"
                      type="text"
                      value={scoreFormData.score}
                      onChange={(e) =>
                        handleFieldUpdate("score", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-chat-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Message to the Admin"
                      name="Message"
                      type="text"
                      value={scoreFormData.message}
                      onChange={(e) =>
                        handleFieldUpdate("message", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <input
                    name="Name"
                    type="submit"
                    style={styles.scoreFormSubmit}
                    value="Submit Weekly Score"
                    className="score-form-submit"
                    hidden
                  />
                </form>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 mb-3">
            <div style={styles.scoreFormCard} className="card shadow-sm">
              <div style={styles.cardBody} className="p-3">
                <h3 style={styles.scoreFormTitle}>Monthly Score</h3>
                <form className="form" onSubmit={SubmitMonthly}>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-clock-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Time of Submission"
                      name="Timing"
                      type="text"
                      value={monthlyScoreFormData.timestamp}
                      readOnly
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-person-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Your Nickname"
                      name="Name"
                      type="text"
                      value={monthlyScoreFormData.nickname}
                      onChange={(e) =>
                        handleFieldMonthlyUpdate("nickname", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-trophy-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Your Score"
                      name="Mscore"
                      type="text"
                      value={monthlyScoreFormData.score}
                      onChange={(e) =>
                        handleFieldMonthlyUpdate("score", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-chat-fill"
                      style={styles.scoreFormInputIcon}
                    ></i>
                    <input
                      placeholder="Message to the Admin"
                      name="Mess"
                      type="text"
                      value={monthlyScoreFormData.message}
                      onChange={(e) =>
                        handleFieldMonthlyUpdate("message", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-star-fill"
                      style={{ ...styles.scoreFormInputIcon, color: "#cd7f32" }}
                    ></i>
                    <input
                      placeholder="Bronze Achievements"
                      name="Bronze"
                      type="number"
                      value={monthlyScoreFormData.bronze}
                      onChange={(e) =>
                        handleFieldMonthlyUpdate("bronze", e.target.value)
                      }
                      style={styles.scoreFormInput}
                      className="score-form-input"
                      readOnly
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi excepción-star-fill"
                      style={{ ...styles.scoreFormInputIcon, color: "#c0c0c0" }}
                    ></i>
                    <input
                      placeholder="Silver Achievements"
                      name="Silver"
                      type="number"
                      value={monthlyScoreFormData.silver}
                      style={styles.scoreFormInput}
                      className="score-form-input"
                      readOnly
                    />
                  </div>
                  <div style={styles.scoreFormInputWrapper}>
                    <i
                      className="bi bi-star-fill"
                      style={{ ...styles.scoreFormInputIcon, color: "#ffd700" }}
                    ></i>
                    <input
                      placeholder="Gold Achievements"
                      name="Gold"
                      type="number"
                      value={monthlyScoreFormData.gold}
                      style={styles.scoreFormInput}
                      className="score-form-input"
                      readOnly
                    />
                  </div>
                  <input
                    name="Submit"
                    type="submit"
                    hidden
                    style={styles.scoreFormSubmit}
                    value="Submit Monthly Score"
                    className="score-form-submit"
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
