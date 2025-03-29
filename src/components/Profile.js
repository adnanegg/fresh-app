import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import { ref, get, update } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;
  const [userProfile, setUserProfile] = useState(() => {
    const storedData = localStorage.getItem(`userData_${userId}`);
    return storedData
      ? JSON.parse(storedData)
      : {
          profile: {
            name: auth.currentUser?.displayName || "User",
          },
          points: { current: 0, total: 4500 },
          Mpoints: { current: 0, total: 12000 },
          lastUpdated: Date.now(),
        };
  });
  const [tempName, setTempName] = useState(userProfile.profile?.name || "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const syncWithFirebase = useCallback(
    async (forceSync = false) => {
      if (!userId) return;
      try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        const firebaseData = snapshot.val() || {};
        const localLastUpdated = userProfile.lastUpdated || 0;
        const firebaseLastUpdated = firebaseData.lastUpdated || 0;

        if (forceSync || firebaseLastUpdated > localLastUpdated) {
          localStorage.setItem(
            `userData_${userId}`,
            JSON.stringify(firebaseData)
          );
          setUserProfile(firebaseData);
          setTempName(firebaseData.profile?.name || "");
        } else {
          const updatedData = {
            ...userProfile,
            lastUpdated: Date.now(),
          };
          await update(userRef, updatedData);
          localStorage.setItem(
            `userData_${userId}`,
            JSON.stringify(updatedData)
          );
        }
      } catch (error) {
        console.error("Sync error:", error);
        Swal.fire({
          icon: "error",
          title: "Sync Failed",
          text: error.message,
        });
      }
    },
    [userId, userProfile]
  );

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      const firebaseData = snapshot.val() || {};

      // Merge with existing local data
      const localData =
        JSON.parse(localStorage.getItem(`userData_${userId}`)) || {};
      const mergedData = {
        ...localData,
        ...firebaseData,
        profile: {
          ...localData.profile,
          ...firebaseData.profile,
        },
      };

      setUserProfile(mergedData);
      setTempName(mergedData.profile?.name || "");
      localStorage.setItem(`userData_${userId}`, JSON.stringify(mergedData));
    } catch (error) {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Failed",
        text: "Could not load profile data.",
      });
    }
  }, [userId]);

  useEffect(() => {
    let intervalId;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        fetchUserData().then(() => syncWithFirebase());
        intervalId = setInterval(() => syncWithFirebase(), 15 * 60 * 1000); // 15 minutes
      }
    });

    return () => {
      unsubscribeAuth();
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigate, fetchUserData, syncWithFirebase]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const updatedData = {
        profile: {
          name: tempName,
        },
        points: userProfile.points || { current: 0, total: 4500 },
        Mpoints: userProfile.Mpoints || { current: 0, total: 12000 },
        lastUpdated: Date.now(),
      };

      const userRef = ref(database, `users/${userId}`);
      await update(userRef, updatedData);

      setUserProfile(updatedData);
      localStorage.setItem(`userData_${userId}`, JSON.stringify(updatedData));

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Update error:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await syncWithFirebase(true); // Force sync on logout
      await signOut(auth);
      // Don't clear localStorage here to maintain data
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text: error.message,
      });
    }
  };

  const handleSyncNow = () => {
    syncWithFirebase(true); // Force sync
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const styles = {
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
  };

  const cssStyles = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;

  return (
    <div className="profile-container">
      <style>{cssStyles}</style>
      <nav style={styles.navBar}>
        <div style={styles.navBrand}>
          <img src="/trackerLogo.png" alt="Logo" style={styles.navLogo} />
          <span style={styles.navTitle}>Profile</span>
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
      <div
        style={{
          ...styles.mobileMenu,
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <Link to="/dashboard" style={styles.mobileNavLink}>
          <i className="bi bi-house-fill" style={styles.navIcon}></i> Dashboard
        </Link>
        <Link to="/normal-mode" style={styles.mobileNavLink}>
          <i className="bi bi-star-fill" style={styles.navIcon}></i> Program
        </Link>
        <button onClick={handleLogout} style={styles.logoutButton}>
          <i className="bi bi-box-arrow-right" style={styles.navIcon}></i>{" "}
          Logout
        </button>
      </div>

      <main className="profile-main">
        <div className="profile-header">
          <div className="header-info">
            <h1 className="user-name">{userProfile.profile?.name}</h1>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="profile-form">
          <div className="form-section">
            <h2>Profile Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Progress</h2>
            <div className="progress-container">
              <div className="progress-item">
                <span>Daily Points: </span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${
                        (userProfile.points?.current /
                          userProfile.points?.total) *
                        100
                      }%`,
                    }}
                  ></div>
                  <span className="progress-text">
                    {userProfile.points?.current} / {userProfile.points?.total}
                  </span>
                </div>
              </div>
              <div className="progress-item">
                <span>Monthly Points: </span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${
                        (userProfile.Mpoints?.current /
                          userProfile.Mpoints?.total) *
                        100
                      }%`,
                    }}
                  ></div>
                  <span className="progress-text">
                    {userProfile.Mpoints?.current} /{" "}
                    {userProfile.Mpoints?.total}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn">
            Save Profile
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={handleSyncNow}
            style={{ background: "#28a745", marginTop: "10px" }}
          >
            Sync Now
          </button>
        </form>
      </main>
    </div>
  );
};

export default Profile;
