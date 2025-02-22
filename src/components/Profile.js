import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/Profile.css"; // New CSS file for custom styling

const Profile = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
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

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar */}
        <div className={`col-auto p-0 sidebar-container ${isSidebarExpanded ? 'expanded' : ''}`}>
          <div className="sidebar">
            <div className="sidebar-header">
              <img src="/trackerLogo.png" alt="xAI Logo" className="whale-logo" />
              <button
                onClick={toggleSidebar}
                className="btn btn-link text-dark expand-toggle p-0"
                aria-label={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <i className={`bi ${isSidebarExpanded ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
              </button>
            </div>
            <ul className="sidebar-nav list-unstyled d-flex flex-column align-items-start">
              <li className="mb-3 w-100">
                <Link to="/dashboard" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
                  <i className="bi bi-house-fill sidebar-icon me-2"></i>
                  {isSidebarExpanded && <span className="sidebar-text">Dashboard</span>}
                </Link>
              </li>
              <li className="mb-3 w-100">
                <Link to="/leaderboard" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'} fw-bold`}>
                  <i className="bi bi-trophy-fill sidebar-icon me-2"></i>
                  {isSidebarExpanded && <span className="sidebar-text">Leaderboard</span>}
                </Link>
              </li>
              <li className="mb-3 w-100">
                <Link to="/profile" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
                  <i className="bi bi-person-fill sidebar-icon me-2"></i>
                  {isSidebarExpanded && <span className="sidebar-text">Profile</span>}
                </Link>
              </li>
              <li className="mb-3 w-100">
                <Link to="/statistics" className={`text-dark d-flex align-items-center ${isSidebarExpanded ? 'justify-content-start' : 'justify-content-center'}`}>
                  <i className="bi bi-bar-chart-fill sidebar-icon me-2"></i>
                  {isSidebarExpanded && <span className="sidebar-text">Statistics</span>}
                </Link>
              </li>
              <li className="mb-3">
                <div className="profile-avatar">
                  <Link to="/profile"><img
                    src={userProfile.photo || "profile-images/default-profile.png"}
                    alt="Profile"
                    className="rounded-circle sidebar-profile-icon"
                  /></Link>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className={`col p-4 profile-content ${isSidebarExpanded ? 'expanded' : ''}`}>
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
    </div>
  );
};

export default Profile;