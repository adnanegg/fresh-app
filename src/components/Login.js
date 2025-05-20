import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updatePassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import "./styles/Login.css";
import Swal from "sweetalert2";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const cacheAndVerifyData = async () => {
    try {
      const globalTasksRef = ref(database, "globalTasks");
      const achievementsRef = ref(database, "achievements");

      const cachedTasks = localStorage.getItem("globalTasks");
      const cachedAchievements = localStorage.getItem("achievements");

      const [tasksSnapshot, achievementsSnapshot] = await Promise.all([
        get(globalTasksRef),
        get(achievementsRef),
      ]);

      const firebaseTasks = tasksSnapshot.val() || {};
      const firebaseAchievements = achievementsSnapshot.val() || {};

      if (!cachedAchievements) {
        localStorage.setItem(
          "achievements",
          JSON.stringify(firebaseAchievements)
        );
      }

      if (!cachedTasks) {
        localStorage.setItem("globalTasks", JSON.stringify(firebaseTasks));
      }

      const currentCachedAchievements = JSON.parse(cachedAchievements || "{}");
      if (
        JSON.stringify(currentCachedAchievements) !==
        JSON.stringify(firebaseAchievements)
      ) {
        localStorage.setItem(
          "achievements",
          JSON.stringify(firebaseAchievements)
        );
        console.log("Achievements updated from Firebase");
      }

      const currentCachedTasks = JSON.parse(cachedTasks || "{}");
      if (
        JSON.stringify(currentCachedTasks) !== JSON.stringify(firebaseTasks)
      ) {
        localStorage.setItem("globalTasks", JSON.stringify(firebaseTasks));
        console.log("Global tasks updated from Firebase");
      }
    } catch (error) {
      console.error("Error caching and verifying data:", error);
    }
  };

  const updateLastLogin = async (userId) => {
    try {
      // Check if lastLogin was already updated in this session
      const sessionKey = `lastLoginUpdated_${userId}`;
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }

      const timestamp = new Date().toISOString();
      await set(ref(database, `users/${userId}/lastLogin`), timestamp);
      console.log(`Updated lastLogin for user ${userId}: ${timestamp}`);

      // Mark lastLogin as updated for this session
      sessionStorage.setItem(sessionKey, "true");
    } catch (error) {
      console.error("Error updating lastLogin:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const oldUserId = localStorage.getItem("userId");
      if (oldUserId) {
        localStorage.removeItem(`userData_${oldUserId}`);
      }

      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const userId = userCredential.user.uid;

      // Update lastLogin
      await updateLastLogin(userId);

      await cacheAndVerifyData();

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userId", userCredential.user.uid);

      navigate("/dashboard");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!currentUser) {
      Swal.fire({
        icon: "warning",
        title: "Not Logged In",
        text: "Please log in first to reset your password.",
        confirmButtonText: "OK",
      });
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: "Reset Password",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Confirm your email" type="email">' +
        '<input id="swal-input2" class="swal2-input" placeholder="Enter new password" type="password">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Reset Password",
      preConfirm: () => {
        const emailInput = document.getElementById("swal-input1").value;
        const newPassword = document.getElementById("swal-input2").value;
        if (!emailInput || !newPassword) {
          Swal.showValidationMessage("Please fill in all fields");
          return false;
        }
        if (newPassword.length < 6) {
          Swal.showValidationMessage("Password must be at least 6 characters");
          return false;
        }
        if (emailInput !== currentUser.email) {
          Swal.showValidationMessage("Email does not match your account");
          return false;
        }
        return newPassword;
      },
    });

    if (formValues) {
      try {
        await updatePassword(currentUser, formValues);
        Swal.fire({
          icon: "success",
          title: "Password Reset",
          text: "Your password has been updated successfully.",
          confirmButtonText: "OK",
        });
      } catch (error) {
        console.error("Error resetting password:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to reset password: " + error.message,
          confirmButtonText: "OK",
        });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (user && isLoggedIn) {
        // Update lastLogin for automatic login
        await updateLastLogin(user.uid);
        await cacheAndVerifyData();
        navigate("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="login-container">
      <video autoPlay loop muted className="video-background">
        <source src="/videos/backvideo4.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="login-card">
        <h2>Login</h2>
        {isLoading ? (
          <div className="login-loading">
            <div className="spinner"></div>
            <p>Logging in and loading data...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
