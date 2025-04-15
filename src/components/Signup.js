import React, { useState } from "react";
import { auth, database } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
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
    const oldUserId = localStorage.getItem("userId");
    if (oldUserId) {
      localStorage.removeItem(`userData_${oldUserId}`);
    }
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userId = user.uid;

      const now = Date.now();

      const globalTasksRef = ref(database, "globalTasks");
      const globalTasksSnapshot = await get(globalTasksRef);
      const globalTasks = globalTasksSnapshot.val() || {};

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
            hasTimesOption: globalTasks[taskId].hasTimesOption || false,
            selectedMode: "normal",
          },
        ])
      );

      const initialUserData = {
        profile: { name, timezone },
        points: { current: 0, total: 800 },
        Mpoints: { current: 0, total: 2800 },
        tasks: initialTasks,
        completedTasks: [],
        lastUpdated: now,
      };

      await set(ref(database, `users/${userId}`), initialUserData);
      localStorage.setItem(
        `userData_${userId}`,
        JSON.stringify(initialUserData)
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
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
