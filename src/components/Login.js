import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updatePassword,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import "./styles/Login.css"; // Import the CSS file
import Swal from "sweetalert2"; // Import SweetAlert2 for confirmation dialog

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null); // Track authenticated user

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // Redirect to the dashboard after login
    } catch (error) {
      alert(error.message);
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

    // Prompt for email confirmation and new password
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

  // Listen for authentication state to get the current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="login-container">
      <video autoPlay loop muted className="video-background">
        <source src="/videos/backvideo4.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="login-card">
        <h2>Login</h2>
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
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
        {/* <button
          onClick={resetPassword}
          className="reset-password-button"
          // Disable if not logged in
        >
          Reset Password
        </button> */}
      </div>
    </div>
  );
};

export default Login;
