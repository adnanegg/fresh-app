import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate,Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import Swal from "sweetalert2";
import "./styles/Dashboard.css";
import "./styles/style.css";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "bootstrap-icons/font/bootstrap-icons.css"; // Import Bootstrap Icons (optional)

const Dashboard = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "User",
    photo: "assets/default-profile.png",
  });
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [xpData, setXpData] = useState({ current: 0, level: 1 });
  const [pointsData, setPointsData] = useState({ current: 0, total: 1000 });
  const [MpointsData, setMpointsData] = useState({ current: 0, total: 3000 });

  // Check if the user is authenticated
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // If the user is not logged in, redirect to the login page
        navigate("/auth");
      } else {
        // If the user is logged in, fetch their data
        const userId = user.uid;
        const userRef = ref(database, `users/${userId}`);

        // Fetch user data from Firebase
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserProfile(data.profile || { name: "User", photo: "assets/default-profile.png" });
            setTasks(data.tasks || []);
            setCompletedTasks(data.completedTasks || []);
            setXpData(data.xp || { current: 0, level: 1 });
            setPointsData(data.points || { current: 0, total: 1000 });
            setMpointsData(data.Mpoints || { current: 0, total: 3000 });
          }
        });
      }
    });

    // Cleanup the subscription
    return () => unsubscribe();
  }, [navigate]);

  // Handle logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/signup");
  };

  // Complete a task
  const completeTask = (index) => {
    const completedTask = tasks[index];
    const newTasks = tasks.filter((_, i) => i !== index);
    const newCompletedTasks = [...completedTasks, completedTask];

    const newXpData = { ...xpData, current: xpData.current + completedTask.xp };
    const newPointsData = { ...pointsData, current: pointsData.current + completedTask.points };
    const newMpointsData = { ...MpointsData, current: MpointsData.current + completedTask.points };

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      tasks: newTasks,
      completedTasks: newCompletedTasks,
      xp: newXpData,
      points: newPointsData,
      Mpoints: newMpointsData,
    });
  };

  // Undo a task
  const undoTask = (index) => {
    const task = completedTasks[index];
    const newCompletedTasks = completedTasks.filter((_, i) => i !== index);
    const newTasks = [...tasks, task];

    const newXpData = { ...xpData, current: xpData.current - task.xp };
    const newPointsData = { ...pointsData, current: pointsData.current - task.points };
    const newMpointsData = { ...MpointsData, current: MpointsData.current - task.points };

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      tasks: newTasks,
      completedTasks: newCompletedTasks,
      xp: newXpData,
      points: newPointsData,
      Mpoints: newMpointsData,
    });
  };

  // Reset completed tasks
  const resetCompletedTasks = () => {
    const newTasks = [...tasks, ...completedTasks];
    const newCompletedTasks = [];

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      tasks: newTasks,
      completedTasks: newCompletedTasks,
    });

    Swal.fire({
      icon: "success",
      title: "Tasks Reset!",
      text: "All completed tasks have been reset without deducting XP.",
      confirmButtonText: "OK",
    });
  };

  // Reset points bar
  const resetPointsBar = () => {
    const newPointsData = { current: 0, total: 1000 };

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      points: newPointsData,
    });

    Swal.fire({
      icon: "success",
      title: "Points Bar Reset!",
      text: "The points bar has been reset to 0.",
      confirmButtonText: "OK",
    });
  };

  // Reset monthly points bar
  const resetMonthlyPointsBar = () => {
    const newMpointsData = { current: 0, total: 3000 };

    // Update Firebase Realtime Database
    const userId = auth.currentUser?.uid;
    const userRef = ref(database, `users/${userId}`);
    update(userRef, {
      Mpoints: newMpointsData,
    });

    Swal.fire({
      icon: "success",
      title: "Monthly Points Bar Reset!",
      text: "The Monthly points bar has been reset to 0.",
      confirmButtonText: "OK",
    });
  };


  return (
    <div className="container-fluid">
    <div className="row">
      {/* Sidebar */}
      <div className="col-md-3 bg-light p-4 vh-100 shadow">
        <h2 className="mb-4">Menu</h2>
        <ul className="list-unstyled">
          <li className="mb-3">
            <a href="/dashboard" className="text-decoration-none text-dark d-flex align-items-center">
              <i className="bi bi-house me-2"></i> Home
            </a>
          </li>
          <li className="mb-3">
            <p className="text-decoration-none text-dark d-flex align-items-center">
              <i className="bi bi-person me-2"></i><Link to="/profile">Profile</Link>  
            </p>
          </li>
          <li className="mb-3">
            <a href="/badges" className="text-decoration-none text-dark d-flex align-items-center">
              <i className="bi bi-award me-2"></i> Badges
            </a>
          </li>
          <li className="mb-3">
            <button onClick={resetCompletedTasks} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
              <i className="bi bi-arrow-repeat me-2"></i> Reset Completed Tasks
            </button>
          </li>
          <li className="mb-3">
            <button onClick={resetPointsBar} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
              <i className="bi bi-bar-chart me-2"></i> Reset Points Bar
            </button>
          </li>
          <li className="mb-3">
            <button onClick={resetMonthlyPointsBar} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
              <i className="bi bi-calendar me-2"></i> Reset Monthly Points
            </button>
          </li>
          <li className="mb-3">
            <button onClick={handleLogout} className="btn btn-link text-decoration-none text-dark d-flex align-items-center w-100 text-start">
              <i className="bi bi-box-arrow-right me-2"></i> Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="col-md-9 p-4">
        {/* Profile and Rank Section */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card text-center p-4">
              <img src={userProfile.photo} alt="Profile" className="rounded-circle mx-auto mb-3" width="100" height="100" />
              <h3 className="golden-3d">{userProfile.name}</h3>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card text-center p-4">
              <h2 className="bronze-3d mb-3">Your Rank</h2>
              <img src="images/rank-warrior.png" alt="Rank" className="mx-auto mb-3" width="80" height="80" />
              <p className="bronze-3d">Warrior</p>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card p-3">
              <h4>XP Progress</h4>
              <div className="progress">
                <div
                  className="progress-bar bg-success"
                  style={{ width: `${(xpData.current / 2000) * 100}%` }}
                ></div>
              </div>
              <span className="mt-2">{xpData.current}/2000 XP</span>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3">
              <h4>Points Progress</h4>
              <div className="progress">
                <div
                  className="progress-bar bg-warning"
                  style={{ width: `${(pointsData.current / pointsData.total) * 100}%` }}
                ></div>
              </div>
              <span className="mt-2">{pointsData.current} pts</span>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3">
              <h4>Monthly Points Progress</h4>
              <div className="progress">
                <div
                  className="progress-bar bg-danger"
                  style={{ width: `${(MpointsData.current / MpointsData.total) * 100}%` }}
                ></div>
              </div>
              <span className="mt-2">{MpointsData.current} pts</span>
            </div>
          </div>
        </div>

        {/* Task Sections */}
        <div className="row">
          <div className="col-md-6">
            <div className="card p-4">
              <h4>Daily Tasks</h4>
              <ul className="list-group">
                {tasks.map((task, index) => (
                  <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <span style={{ color: "brown" }}>{task.name}</span> ({task.xp} XP, {task.points} Points)
                    </span>
                    <button onClick={() => completeTask(index)} className="btn btn-success btn-sm">
                      Complete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card p-4">
              <h4>Today's Completed Tasks</h4>
              <ul className="list-group">
                {completedTasks.map((task, index) => (
                  <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      {task.name} ({task.xp} XP, {task.points} Points)
                    </span>
                    <button onClick={() => undoTask(index)} className="btn btn-danger btn-sm">
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Dashboard;
