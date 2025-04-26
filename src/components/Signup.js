import React, { useState } from "react";
import { auth, database } from "../firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import "./styles/Signup.css";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const navigate = useNavigate();

  const timezones = ["Africa/Casablanca", "America/Montreal"];

  const handleSignup = async (e) => {
    e.preventDefault();

    // Clear old user data from localStorage
    const oldUserId = localStorage.getItem("userId");
    if (oldUserId) {
      localStorage.removeItem(`userData_${oldUserId}`);
    }
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userId = user.uid;

      console.log("User created with UID:", userId);

      // Wait for the authentication state to fully update
      await new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          (currentUser) => {
            unsubscribe(); // Unsubscribe immediately after first callback
            if (currentUser && currentUser.uid === userId) {
              console.log("Auth state confirmed for UID:", currentUser.uid);
              resolve(currentUser);
            } else {
              reject(new Error("Authentication state not updated correctly"));
            }
          },
          reject
        );
      });

      // Fetch global tasks
      const globalTasksRef = ref(database, "globalTasks");
      let globalTasks = {};
      try {
        const globalTasksSnapshot = await get(globalTasksRef);
        globalTasks = globalTasksSnapshot.val() || {};
      } catch (error) {
        console.warn(
          "Failed to fetch globalTasks (admin-only access):",
          error.message
        );
        // Since globalTasks has admin-only read access, new users can't read it.
        // This is okay because we only need globalTasks for initializing tasks,
        // and we can handle an empty object gracefully.
      }

      // Cache globalTasks in localStorage
      localStorage.setItem("globalTasks", JSON.stringify(globalTasks));
      localStorage.setItem("userId", userId);

      const initialTasks = Object.fromEntries(
        Object.keys(globalTasks).map((taskId) => [
          taskId,
          {
            completionCount: 0,
            dailyCounter: 0,
            boost: null,
            hasTimesOption: globalTasks[taskId]?.hasTimesOption || false,
            selectedMode: "normal",
          },
        ])
      );

      const now = Date.now();
      const initialUserData = {
        profile: { name, timezone },
        points: { current: 0, total: 800 },
        Mpoints: { current: 0, total: 2800 },
        tasks: initialTasks,
        completedTasks: [],
        lastUpdated: now,
      };

      // Write user data to the database
      console.log("Attempting to write user data to path:", `users/${userId}`);
      await set(ref(database, `users/${userId}`), initialUserData)
        .then(() => {
          console.log("User data written successfully");
        })
        .catch((error) => {
          console.error("Failed to write user data:", error.message);
          throw error;
        });

      // Cache user data in localStorage
      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify(initialUserData)
      );

      // Navigate to dashboard
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate("/dashboard");
    } catch (error) {
      console.error("Signup error:", error.message);
      alert(`Failed to sign up: ${error.message}`);
    }
  };

  return (
    <div
      className="signup-container"
      style={{ background: "linear-gradient(135deg, #1e3c72, #2a5298)" }}
    >
      <div className="signup-card">
        <h2>Sign Up</h2>
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            >
              <option value="">Select Timezone</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="signup-button">
            Sign Up
          </button>
        </form>
        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
