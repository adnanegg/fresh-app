// Leaderboard.js
import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate,Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/Leaderboard.css";

// Ranking configuration (copied from Dashboard.js to ensure consistency)
const rankingConfig = {
  thresholds: [100, 200, 300, 400, 500],
  ranks: ["Warrior", "Master", "Grand Master", "Legend", "Mythic"],
  images: [
    "ranking-images/rank-warrior.png",
    "ranking-images/rank-master.png",
    "ranking-images/rank-grandmaster.png",
    "ranking-images/rank-legend.png",
    "ranking-images/rank-mythic.png",
  ],
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // New state for sidebar expansion
  const [userProfile, setUserProfile] = useState({
      name: "User",
      photo: "profile-images/default-profile.png",
      rankName: "Warrior", rankImage: "ranking-images/rank-warrior.png"
    });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const usersRef = ref(database, "users");
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const usersArray = Object.entries(data).map(([uid, userData]) => ({
            uid,
            name: userData.profile?.name || "Anonymous",
            rankName: userData.profile?.rankName || "Warrior",
            rankImage: userData.profile?.rankImage || "ranking-images/rank-warrior.png",
            xp: userData.xp?.current || 0,
            // Calculate rank index based on rankName
            rankIndex: rankingConfig.ranks.indexOf(userData.profile?.rankName || "Warrior"),
          }));

          // Sort users by rank index (descending) and then by XP within the same rank
          usersArray.sort((a, b) => {
            if (b.rankIndex === a.rankIndex) {
              return b.xp - a.xp; // If same rank, sort by XP
            }
            return b.rankIndex - a.rankIndex; // Higher rank index (Mythic = 4) comes first
          });

          setUsers(usersArray);
          setLoading(false);
        }
      });
    });

    return () => unsubscribe();
  }, [navigate]);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  if (loading) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

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
                  src={userProfile.photo || "profile-images/default-profile.png"} // You'll need to fetch or pass userProfile here
                  alt="Profile"
                  className="rounded-circle sidebar-profile-icon"
                /></Link>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className={`col p-4 ${isSidebarExpanded ? 'expanded' : ''}`}>
        <div className="col-md-9 p-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">Leaderboard</h2>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Name</th>
                      <th scope="col">Rank</th>
                      <th scope="col">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.uid}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={user.rankImage}
                              alt={user.rankName}
                              className="me-2 rounded-circle"
                              width="30"
                              height="30"
                            />
                            {user.name}
                          </div>
                        </td>
                        <td>{user.rankName}</td>
                        <td>{user.xp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Leaderboard;