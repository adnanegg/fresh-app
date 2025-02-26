import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/Profile.css"; // Use CSS for styling

const Profile = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "profile-images/default-profile.png",
    rankName: "Warrior",
    rankImage: "ranking-images/rank-warrior.png",
  });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      navigate("/profile");
      return;
    }

    const userRef = ref(database, `users/${userId}/profile`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setName(data.name || "");
        setPhoto(data.photo || "profile-images/default-profile.png");
        setUserProfile({
          ...userProfile,
          name: data.name || "User",
          photo: data.photo || "profile-images/default-profile.png",
          rankName: data.rankName || "Warrior",
          rankImage: data.rankImage || "ranking-images/rank-warrior.png",
        });
      }
    });
  }, [navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const userId = auth.currentUser?.uid;

    if (!userId) return;

    try {
      let photoUrl = photo;

      if (photoFile) {
        const reader = new FileReader();
        reader.readAsDataURL(photoFile);
        
        photoUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
      }

      const userRef = ref(database, `users/${userId}/profile`);
      await update(userRef, {
        name: name,
        photo: photoUrl,
        rankName: userProfile.rankName, // Preserve rank
        rankImage: userProfile.rankImage, // Preserve rank image
      });

      setName("");
      setPhotoFile(null);

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your profile has been updated successfully.",
        confirmButtonText: "OK",
        showConfirmButton: true,
        customClass: {
          popup: "swal2-modern",
        },
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
        confirmButtonText: "OK",
        customClass: {
          popup: "swal2-modern",
        },
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signup");
  };

  return (
    <div className="container-fluid">
      <div className="top-bar">
        <img src="/trackerLogo.png" alt="xAI Logo" className="whale-logo" />
        <Link to="/dashboard" className="top-bar-link">
          <i className="bi bi-house-fill top-bar-icon"></i>
          Dashboard
        </Link>
        <Link to="/leaderboard" className="top-bar-link">
          <i className="bi bi-trophy-fill top-bar-icon"></i>
          Leaderboard
        </Link>
        <Link to="/profile" className="top-bar-link">
          <i className="bi bi-person-fill top-bar-icon"></i>
          Profile
        </Link>
        <Link to="/statistics" className="top-bar-link">
          <i className="bi bi-bar-chart-fill top-bar-icon"></i>
          Statistics
        </Link>
        <Link to="/ranked-mode" className="top-bar-link">
          <i className="bi bi-shield-fill top-bar-icon"></i>
          Ranked Mode
        </Link>
        <Link to="/normal-mode" className="top-bar-link">
          <i className="bi bi-star-fill top-bar-icon"></i>
          Normal Mode
        </Link>
        <div className="profile-avatar">
          <Link to="/profile">
            <img
              src={userProfile.photo || "profile-images/default-profile.png"}
              alt="Profile"
              className="sidebar-profile-icon rounded-circle"
            />
          </Link>
        </div>
      </div>
      <div className="dashboard-content">
        <div className="profile-container">
          <div className="profile-header text-center mb-5">
            <h1 className="profile-title">User Profile</h1>
            <div className="profile-rank mb-3">
              <img
                src={userProfile.rankImage}
                alt={userProfile.rankName}
                className="rank-icon"
              />
              <h3 className="rank-name text-dark fw-bold">{userProfile.rankName}</h3>
            </div>
          </div>

          <div className="profile-card shadow-lg">
            <div className="profile-avatar-section">
              <div className="avatar-wrapper">
                <img
                  src={photo || userProfile.photo}
                  alt="Profile"
                  className="profile-avatar-img"
                />
                <label htmlFor="photoUpload" className="upload-btn">
                  <i className="bi bi-camera-fill"></i> Change Photo
                </label>
                <input
                  type="file"
                  id="photoUpload"
                  className="d-none"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group mb-4">
                <label className="form-label text-dark fw-bold">Name</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-100 mb-4">
                Update Profile
              </button>

              <button
                onClick={handleLogout}
                className="btn btn-danger btn-lg w-100"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;