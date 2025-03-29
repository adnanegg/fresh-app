import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, get, update } from "firebase/database";
import Swal from "sweetalert2";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;
  const [userProfile, setUserProfile] = useState(() => {
    const storedData = localStorage.getItem(`userData_${userId}`);
    const data = storedData ? JSON.parse(storedData) : {};
    return {
      name: data.profile?.name || "User",
    };
  });
  const [pointsData, setPointsData] = useState(() => {
    const storedData = localStorage.getItem(`userData_${userId}`);
    return storedData
      ? JSON.parse(storedData).points || { current: 0, total: 4500 }
      : { current: 0, total: 4500 };
  });
  const [MpointsData, setMpointsData] = useState(() => {
    const storedData = localStorage.getItem(`userData_${userId}`);
    return storedData
      ? JSON.parse(storedData).Mpoints || { current: 0, total: 12000 }
      : { current: 0, total: 12000 };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [scoreFormData, setScoreFormData] = useState({
    timestamp: new Date().toLocaleTimeString(),
    nickname: userProfile.name,
    score: pointsData.current.toString(),
    message: "",
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);

  const syncWithFirebase = useCallback(async () => {
    if (!userId) return;
    setIsLoading(false);
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      const firebaseData = snapshot.val() || {};
      const localLastUpdated = localStorage.getItem(`userData_${userId}`)
        ? JSON.parse(localStorage.getItem(`userData_${userId}`)).lastUpdated ||
          0
        : 0;
      const firebaseLastUpdated = firebaseData.lastUpdated || 0;

      if (firebaseLastUpdated > localLastUpdated) {
        localStorage.setItem(
          `userData_${userId}`,
          JSON.stringify(firebaseData)
        );
        setUserProfile(firebaseData.profile || { name: "User" });
        setPointsData(firebaseData.points || { current: 0, total: 4500 });
        setMpointsData(firebaseData.Mpoints || { current: 0, total: 12000 });
        setScoreFormData({
          timestamp: new Date().toLocaleTimeString(),
          nickname: firebaseData.profile?.name || "User",
          score: firebaseData.points?.current.toString() || "0",
          message: "",
        });
      } else {
        const updatedData = {
          profile: userProfile,
          points: pointsData,
          Mpoints: MpointsData,
          lastUpdated: Date.now(),
        };
        await update(userRef, updatedData);
        localStorage.setItem(`userData_${userId}`, JSON.stringify(updatedData));
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, userProfile, pointsData, MpointsData]);

  const fetchUserData = useCallback(async (userId, isInitial = false) => {
    if (isInitial) setIsLoading(false);
    try {
      const [profileSnap, pointsSnap, mPointsSnap] = await Promise.all([
        get(ref(database, `users/${userId}/profile`)),
        get(ref(database, `users/${userId}/points`)),
        get(ref(database, `users/${userId}/Mpoints`)),
      ]);

      const profileData = profileSnap.val() || { name: "User" };
      const points = pointsSnap.val() || { current: 0, total: 4500 };
      const mpoints = mPointsSnap.val() || { current: 0, total: 12000 };

      setUserProfile(profileData);
      setPointsData(points);
      setMpointsData(mpoints);
      setScoreFormData({
        timestamp: new Date().toLocaleTimeString(),
        nickname: profileData.name,
        score: points.current.toString(),
        message: "",
      });

      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify({
          profile: profileData,
          points: points,
          Mpoints: mpoints,
          lastUpdated: Date.now(),
        })
      );

      if (auth.currentUser?.email === "admin@gmail.com") {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      if (isInitial) {
        Swal.fire({
          icon: "error",
          title: "Fetch Failed",
          text: "Could not load dashboard data.",
        });
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        fetchUserData(user.uid, true);
        intervalId = setInterval(() => syncWithFirebase(), 15 * 60 * 1000);
      }
    });

    return () => {
      unsubscribeAuth();
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigate, fetchUserData, syncWithFirebase]);

  const submitAllUserForms = async () => {
    try {
      setIsLoading(true);
      Swal.fire({
        title: "Processing...",
        html: "Submitting all user forms",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
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

      let successCount = 0;
      let errorCount = 0;

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

          if (response.ok) {
            successCount++;
          } else {
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
        html: `
          <div style="text-align: left;">
            <p><strong>Total users processed:</strong> ${userIds.length}</p>
            <p><strong>Successful submissions:</strong> ${successCount}</p>
            <p><strong>Failed submissions:</strong> ${errorCount}</p>
          </div>
        `,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Submission error:", error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: error.message || "Error starting the submission process",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPointsBar = useCallback(async () => {
    const newPointsData = { current: 0, total: 4500 };
    const userId = auth.currentUser?.uid;
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
      fetchUserData(userId);
      Swal.fire({
        icon: "success",
        title: "Points Bar Reset!",
        text: "The points bar has been reset to 0.",
      });
    }
  }, [fetchUserData]);

  const resetMonthlyPointsBar = useCallback(async () => {
    const newMpointsData = { current: 0, total: 12000 };
    const userId = auth.currentUser?.uid;
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
      fetchUserData(userId);
      Swal.fire({
        icon: "success",
        title: "Monthly Points Bar Reset!",
        text: "The Monthly points bar has been reset to 0.",
      });
    }
  }, [fetchUserData]);

  const handleLogout = useCallback(async () => {
    await syncWithFirebase();
    await signOut(auth);
    localStorage.removeItem(`userData_${userId}`);
    navigate("/login");
  }, [navigate, syncWithFirebase]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

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
      setScoreFormData((prev) => ({ ...prev, nickname: tempName }));
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
      borderRadius: "8px",
      background: "white",
      border: "1px solid #e9ecef",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      padding: "15px",
      marginTop: "10px",
      width: "100%",
      maxWidth: "100%",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
    },
    scoreFormInput: {
      width: "100%",
      padding: "10px",
      marginBottom: "12px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      fontSize: "16px",
      transition: "border-color 0.3s ease",
    },
    scoreFormSubmit: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#007bff",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "16px",
      transition: "background-color 0.3s ease, transform 0.2s ease",
    },
    scoreFormTitle: {
      fontSize: "18px",
      fontWeight: "bold",
      color: "#007bff",
      marginBottom: "15px",
      textAlign: "center",
      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2)",
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
      backgroundColor: "rgba(0, 0, 0, 0)",
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
  };
  const stylesString = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    @keyframes spark {
      0% { opacity: 0; transform: translateX(-50%) scale(0); }
      50% { opacity: 0.8; transform: translateX(-50%) scale(1); }
      100% { opacity: 0; transform: translateX(-50%) scale(0); }
    }
    @media (max-width: 768px) {
      .container-fluid { padding: 0; overflow-x: hidden; }
      .row { margin-right: 0; margin-left: 0; }
      .col-12 { padding-right: 10px; padding-left: 10px; }
      form input[type="submit"] {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 6px;
        width: 100%;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.3s;
      }
      form input[type="submit"]:hover { background-color: #0056b3; }
    }
  `;

  const getProgressColor = (current, total) => {
    const percentage = (current / total) * 100;
    if (percentage >= 75) return "#28a745";
    if (percentage >= 25) return "#ffc107";
    return "#dc3545";
  };

  function Submit(e) {
    e.preventDefault();
    const formEle = document.querySelector("form");
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
          text: "Your score has been submitted.",
        });
        setScoreFormData((prev) => ({
          ...prev,
          message: "",
          timestamp: new Date().toLocaleTimeString(),
        }));
      })
      .catch((error) => {
        Swal.fire({
          icon: "error",
          title: "Submission Failed",
          text: "There was an error submitting your score.",
        });
      });
  }

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
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {isAdmin && (
              <button
                onClick={submitAllUserForms}
                className="btn btn-danger w-100 mb-4"
                style={{ padding: "10px", position: "relative", zIndex: 100 }}
              >
                <i className="bi bi-send-fill me-2"></i>
                Submit All User Forms
              </button>
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
                      </>
                    )}
                    <p className="text-muted small">
                      Caleb User ID: {auth.currentUser?.uid?.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-12 col-md-4 mb-3 mb-md-0">
                <div style={styles.dashboardCard} className="card shadow-sm">
                  <div style={styles.cardBody} className="p-3 text-center">
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

            <div className="col-12 col-md-6">
              <div style={styles.scoreFormCard} className="card shadow-sm">
                <div style={styles.cardBody} className="p-3">
                  <h3 style={styles.scoreFormTitle}>Weekly Score Form</h3>
                  <form className="form" onSubmit={(e) => Submit(e)}>
                    <input
                      placeholder="Time of submission : HH:MM:SS"
                      name="Time"
                      type="text"
                      value={scoreFormData.timestamp}
                      readOnly
                      style={styles.scoreFormInput}
                    />
                    <input
                      placeholder="Your Nickname"
                      name="Nickname"
                      type="text"
                      value={scoreFormData.nickname}
                      onChange={(e) =>
                        setScoreFormData({
                          ...scoreFormData,
                          nickname: e.target.value,
                        })
                      }
                      style={styles.scoreFormInput}
                    />
                    <input
                      placeholder="Your Score"
                      name="Score"
                      type="text"
                      value={scoreFormData.score}
                      onChange={(e) =>
                        setScoreFormData({
                          ...scoreFormData,
                          score: e.target.value,
                        })
                      }
                      style={styles.scoreFormInput}
                    />
                    <input
                      placeholder="Message"
                      name="Message"
                      type="text"
                      value={scoreFormData.message}
                      onChange={(e) =>
                        setScoreFormData({
                          ...scoreFormData,
                          message: e.target.value,
                        })
                      }
                      style={styles.scoreFormInput}
                    />
                    <input
                      name="Name"
                      type="submit"
                      style={styles.scoreFormSubmit}
                      value="Submit Score"
                    />
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
