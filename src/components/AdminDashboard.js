import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import {
  ref,
  onValue,
  update,
  remove,
  push,
  set,
  get,
} from "firebase/database";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [usersData, setUsersData] = useState([]);
  const [globalTasks, setGlobalTasks] = useState({});
  const [feedbackData, setFeedbackData] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingMessageUserId, setEditingMessageUserId] = useState(null);
  const [editedUserData, setEditedUserData] = useState({});
  const [editedTaskData, setEditedTaskData] = useState({});
  const [editedMessageData, setEditedMessageData] = useState({ message: "" });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterMode, setFilterMode] = useState("");
  const isAdmin = auth.currentUser?.email === "admin@gmail.com";

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  // Fetch users, global tasks, and feedback
  useEffect(() => {
    const usersRef = ref(database, "users");
    const globalTasksRef = ref(database, "globalTasks");
    const feedbackRef = ref(database, "feedback");

    const unsubscribeUsers = onValue(
      usersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const users = snapshot.val();
          const formattedData = Object.keys(users).map((userId) => ({
            userId,
            profileName: users[userId].profile?.name || "User",
            lastLogin: users[userId].lastLogin || "N/A",
            points: users[userId].points?.current || 0,
            pointsTotal: users[userId].points?.total || 800,
            mpoints: users[userId].Mpoints?.current || 0,
            mpointsTotal: users[userId].Mpoints?.total || 2800,
            mode: users[userId].preferences?.mode || "weekly",
            adminMessage: users[userId].adminMessage || "",
          }));
          setUsersData(formattedData);
        } else {
          setUsersData([]);
        }
      },
      (error) => {
        console.error("Error fetching users:", error);
        Swal.fire({
          icon: "error",
          title: "Fetch Failed",
          text: "Failed to fetch user data.",
        });
      }
    );

    const unsubscribeGlobalTasks = onValue(
      globalTasksRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setGlobalTasks(snapshot.val());
        } else {
          setGlobalTasks({});
        }
      },
      (error) => {
        console.error("Error fetching global tasks:", error);
        Swal.fire({
          icon: "error",
          title: "Fetch Failed",
          text: "Failed to fetch global tasks.",
        });
      }
    );

    const unsubscribeFeedback = onValue(
      feedbackRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const feedback = snapshot.val();
          const formattedFeedback = Object.entries(feedback)
            .map(([userId, userFeedback]) =>
              Object.entries(userFeedback).map(([feedbackId, fb]) => ({
                userId,
                feedbackId,
                message: fb.message,
                timestamp: fb.timestamp,
              }))
            )
            .flat();
          setFeedbackData(formattedFeedback);
        } else {
          setFeedbackData([]);
        }
      },
      (error) => {
        console.error("Error fetching feedback:", error);
        Swal.fire({
          icon: "error",
          title: "Fetch Failed",
          text: "Failed to fetch feedback.",
        });
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeGlobalTasks();
      unsubscribeFeedback();
    };
  }, []);

  // Log admin actions
  const logAdminAction = useCallback(async (action, details) => {
    try {
      const adminActionsRef = ref(database, "adminActions");
      await push(adminActionsRef, {
        adminEmail: auth.currentUser.email,
        action,
        details,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error logging admin action:", error);
    }
  }, []);

  // Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    setUsersData((prev) =>
      [...prev].sort((a, b) => {
        if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
        if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
        return 0;
      })
    );
  };

  // Filtering
  const filteredUsers = filterMode
    ? usersData.filter((user) => user.mode === filterMode)
    : usersData;

  // User editing
  const handleEditUser = (user) => {
    setEditingUserId(user.userId);
    setEditedUserData({
      profileName: user.profileName,
      points: user.points,
      mpoints: user.mpoints,
      mode: user.mode,
    });
  };

  const handleCancelUserEdit = () => {
    setEditingUserId(null);
    setEditedUserData({});
  };

  const handleSaveUserEdit = async (userId) => {
    try {
      if (editedUserData.profileName.trim() === "") {
        Swal.fire({
          icon: "error",
          title: "Invalid Name",
          text: "Profile name cannot be empty.",
        });
        return;
      }
      if (editedUserData.points < 0 || editedUserData.mpoints < 0) {
        Swal.fire({
          icon: "error",
          title: "Invalid Points",
          text: "Points and Mpoints cannot be negative.",
        });
        return;
      }
      if (!["daily", "weekly"].includes(editedUserData.mode)) {
        Swal.fire({
          icon: "error",
          title: "Invalid Mode",
          text: "Mode must be 'daily' or 'weekly'.",
        });
        return;
      }

      const userRef = ref(database, `users/${userId}`);
      const updates = {
        "profile/name": editedUserData.profileName,
        "points/current": parseInt(editedUserData.points),
        "Mpoints/current": parseInt(editedUserData.mpoints),
        "preferences/mode": editedUserData.mode,
      };
      await update(userRef, updates);

      await logAdminAction("edit_user", {
        userId,
        changes: updates,
      });

      Swal.fire({
        icon: "success",
        title: "User Updated",
        text: "User data has been successfully updated.",
      });
      setEditingUserId(null);
      setEditedUserData({});
    } catch (error) {
      console.error("Update error:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update user data.",
      });
    }
  };

  // User deletion
  const handleDeleteUser = async (userId, profileName) => {
    const result = await Swal.fire({
      title: `Delete ${profileName}?`,
      text: "This will permanently delete the user's account and data. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete",
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: "Deleting User...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);

        await logAdminAction("delete_user", { userId, profileName });

        Swal.fire({
          icon: "success",
          title: "User Deleted",
          text: `${profileName}'s data has been deleted.`,
        });
      } catch (error) {
        console.error("Delete user error:", error);
        Swal.fire({
          icon: "error",
          title: "Deletion Failed",
          text: "Failed to delete user data.",
        });
      }
    }
  };

  // Bulk edits
  const handleBulkEdit = async (action) => {
    if (selectedUsers.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Users Selected",
        text: "Please select at least one user.",
      });
      return;
    }

    if (action === "resetPoints") {
      const result = await Swal.fire({
        title: "Reset Points for Selected Users?",
        text: "This will set points to 0 for all selected users.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        confirmButtonText: "Yes, reset",
      });

      if (result.isConfirmed) {
        try {
          for (const userId of selectedUsers) {
            const userRef = ref(database, `users/${userId}`);
            await update(userRef, { "points/current": 0 });
            await logAdminAction("bulk_reset_points", { userId });
          }
          Swal.fire({
            icon: "success",
            title: "Points Reset",
            text: "Points reset for selected users.",
          });
          setSelectedUsers([]);
        } catch (error) {
          console.error("Bulk reset error:", error);
          Swal.fire({
            icon: "error",
            title: "Reset Failed",
            text: "Failed to reset points.",
          });
        }
      }
    } else if (action === "setMode") {
      const { value: mode } = await Swal.fire({
        title: "Set Mode for Selected Users",
        input: "select",
        inputOptions: {
          daily: "Daily",
          weekly: "Weekly",
        },
        inputPlaceholder: "Select mode",
        showCancelButton: true,
      });

      if (mode) {
        try {
          for (const userId of selectedUsers) {
            const userRef = ref(database, `users/${userId}`);
            await update(userRef, { "preferences/mode": mode });
            await logAdminAction("bulk_set_mode", { userId, mode });
          }
          Swal.fire({
            icon: "success",
            title: "Mode Updated",
            text: `Mode set to ${mode} for selected users.`,
          });
          setSelectedUsers([]);
        } catch (error) {
          console.error("Bulk set mode error:", error);
          Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: "Failed to update mode.",
          });
        }
      }
    }
  };

  // Global tasks editing
  const handleEditTask = (taskId) => {
    setEditingTaskId(taskId);
    setEditedTaskData({
      category: globalTasks[taskId]?.category || "",
      dailyLimit: globalTasks[taskId]?.dailyLimit || 1,
      hasExceptionalOption: globalTasks[taskId]?.hasExceptionalOption || false,
      hasTimesOption: globalTasks[taskId]?.hasTimesOption || false,
      name: globalTasks[taskId]?.name || "",
      numberLimit: globalTasks[taskId]?.numberLimit || 0,
      penaltyPoints: globalTasks[taskId]?.penaltyPoints || 0,
      points: globalTasks[taskId]?.points || 10,
      selectedMode: globalTasks[taskId]?.selectedMode || "normal",
      summary: globalTasks[taskId]?.summary || "",
    });
  };

  const handleCancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditedTaskData({});
  };

  const handleSaveTaskEdit = async (taskId) => {
    try {
      if (editedTaskData.name.trim() === "") {
        Swal.fire({
          icon: "error",
          title: "Invalid Name",
          text: "Task name cannot be empty.",
        });
        return;
      }
      if (
        editedTaskData.dailyLimit < 0 ||
        editedTaskData.numberLimit < 0 ||
        editedTaskData.points < 0 ||
        editedTaskData.penalty < 0 ||
        editedTaskData.penaltyPoints < 0 ||
        editedTaskData.weeklyFrequency < 0 ||
        editedTaskData.level < 1 ||
        editedTaskData.maxLevel < editedTaskData.level ||
        editedTaskData.requiredCompletionsForNextLevel < 0 ||
        editedTaskData.requiredCompletions < 0
      ) {
        Swal.fire({
          icon: "error",
          title: "Invalid Values",
          text: "Numeric values cannot be negative, and maxLevel must be >= level.",
        });
        return;
      }

      const taskRef = ref(database, `globalTasks/${taskId}`);
      const updates = {
        category: editedTaskData.category,
        dailyLimit: parseInt(editedTaskData.dailyLimit),
        frequencyUnit: editedTaskData.frequencyUnit,
        hasExceptionalOption: editedTaskData.hasExceptionalOption,
        hasTimesOption: editedTaskData.hasTimesOption,
        name: editedTaskData.name,
        numberLimit: parseInt(editedTaskData.numberLimit),
        penalty: parseInt(editedTaskData.penalty),
        penaltyPoints: parseInt(editedTaskData.penaltyPoints),
        points: parseInt(editedTaskData.points),
        selectedMode: editedTaskData.selectedMode,
        summary: editedTaskData.summary,
        weeklyFrequency: parseInt(editedTaskData.weeklyFrequency),
        level: parseInt(editedTaskData.level),
        maxLevel: parseInt(editedTaskData.maxLevel),
        requiredCompletionsForNextLevel: parseInt(
          editedTaskData.requiredCompletionsForNextLevel
        ),
        requiredCompletions: parseInt(editedTaskData.requiredCompletions),
      };
      await update(taskRef, updates);

      await logAdminAction("edit_global_task", { taskId, changes: updates });

      Swal.fire({
        icon: "success",
        title: "Task Updated",
        text: "Global task has been updated.",
      });
      setEditingTaskId(null);
      setEditedTaskData({});
    } catch (error) {
      console.error("Update task error:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update global task.",
      });
    }
  };

  // Admin messages
  const handleEditMessage = (user) => {
    setEditingMessageUserId(user.userId);
    setEditedMessageData({ message: user.adminMessage || "" });
  };

  const handleCancelMessageEdit = () => {
    setEditingMessageUserId(null);
    setEditedMessageData({ message: "" });
  };

  const handleSaveMessageEdit = async (userId) => {
    try {
      // Validate the message
      if (
        !editedMessageData.message ||
        editedMessageData.message.trim() === ""
      ) {
        throw new Error("Message cannot be empty");
      }

      const userRef = ref(database, `users/${userId}`);
      // Save the message directly from editedMessageData
      await update(userRef, { adminMessage: editedMessageData.message });

      // Log the admin action
      await logAdminAction("edit_admin_message", {
        userId,
        message: editedMessageData.message,
      });

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Message Updated",
        text: "User admin message has been updated.",
        timer: 1500,
      });

      // Reset state
      setEditingMessageUserId(null);
      setEditedMessageData({ message: "" });
    } catch (error) {
      console.error("Update message error:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: `Failed to update admin message: ${error.message}`,
      });
    }
  };
  const handleAddMessageToAllUsers = async () => {
    const { value: message } = await Swal.fire({
      title: "Add Message to All Users",
      input: "textarea",
      inputLabel: "Message",
      inputPlaceholder: "Enter the message for all users",
      showCancelButton: true,
    });

    if (message) {
      try {
        for (const user of usersData) {
          const userRef = ref(database, `users/${user.userId}`);
          await update(userRef, { adminMessage: message });
        }

        await logAdminAction("add_message_to_all", { message });

        Swal.fire({
          icon: "success",
          title: "Messages Added",
          text: "Message added to all users.",
        });
      } catch (error) {
        console.error("Add message to all error:", error);
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: "Failed to add message to all users.",
        });
      }
    }
  };

  const handleInputChange = (field, value, isUser = true, isTask = false) => {
    if (isUser) {
      setEditedUserData((prev) => ({ ...prev, [field]: value }));
    } else if (isTask) {
      setEditedTaskData((prev) => ({ ...prev, [field]: value }));
    } else {
      setEditedMessageData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const styles = {
    container: {
      padding: "20px",
      marginTop: "60px",
      maxWidth: "1200px",
      marginLeft: "auto",
      marginRight: "auto",
    },
    card: {
      borderRadius: "12px",
      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
      background: "linear-gradient(135deg, #ffffff, #f8f9fa)",
      border: "2px solid #2dd4bf",
      padding: "20px",
      marginBottom: "20px",
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      marginBottom: "20px",
      color: "#343a40",
      textAlign: "center",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      background: "linear-gradient(to right, #a855f7, #3b82f6)",
      color: "#ffffff",
      padding: "12px",
      textAlign: "left",
      fontSize: "14px",
      cursor: "pointer",
    },
    td: {
      padding: "10px",
      borderBottom: "1px solid #dee2e6",
      fontSize: "14px",
    },
    input: {
      width: "100%",
      padding: "5px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "14px",
    },
    select: {
      width: "100%",
      padding: "5px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "14px",
    },
    button: {
      padding: "5px 10px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      marginRight: "5px",
    },
    saveButton: {
      backgroundColor: "#28a745",
      color: "white",
    },
    cancelButton: {
      backgroundColor: "#dc3545",
      color: "white",
    },
    editButton: {
      backgroundColor: "#007bff",
      color: "white",
    },
    deleteButton: {
      backgroundColor: "#dc3545",
      color: "white",
    },
    bulkButton: {
      padding: "10px 20px",
      margin: "10px 5px",
      backgroundColor: "#6f42c1",
      color: "white",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
    },
    filterSelect: {
      padding: "5px",
      margin: "10px 0",
      borderRadius: "4px",
      border: "1px solid #ccc",
      fontSize: "14px",
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
      backgroundColor: "rgba(0, 0, 0, 0.02)",
      zIndex: -1,
    },
  };

  return (
    <div style={styles.container}>
      <video autoPlay loop muted style={styles.videoBackground}>
        <source src="/videos/backvideo2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={styles.videoOverlay}></div>

      <h2 style={styles.title}>
        <i
          className="bi bi-person-fill-gear me-2"
          style={{ color: "#3b82f6" }}
        ></i>
        Admin Dashboard
      </h2>

      {/* Users Section */}
      <div style={styles.card}>
        <h3 style={{ ...styles.title, fontSize: "1.2rem" }}>Users</h3>
        <div style={{ marginBottom: "10px" }}>
          <label>Filter by Mode: </label>
          <select
            style={styles.filterSelect}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="">All</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <button
            style={styles.bulkButton}
            onClick={() => handleBulkEdit("resetPoints")}
          >
            Reset Points
          </button>
          <button
            style={styles.bulkButton}
            onClick={() => handleBulkEdit("setMode")}
          >
            Set Mode
          </button>
        </div>
        {filteredUsers.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map((u) => u.userId));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    checked={selectedUsers.length === filteredUsers.length}
                  />
                </th>
                <th style={styles.th} onClick={() => handleSort("userId")}>
                  User ID{" "}
                  {sortConfig.key === "userId" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th style={styles.th} onClick={() => handleSort("profileName")}>
                  Profile Name{" "}
                  {sortConfig.key === "profileName" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th style={styles.th} onClick={() => handleSort("lastLogin")}>
                  Last Login{" "}
                  {sortConfig.key === "lastLogin" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th style={styles.th} onClick={() => handleSort("points")}>
                  Points{" "}
                  {sortConfig.key === "points" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th style={styles.th} onClick={() => handleSort("mpoints")}>
                  Mpoints{" "}
                  {sortConfig.key === "mpoints" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th style={styles.th} onClick={() => handleSort("mode")}>
                  Mode{" "}
                  {sortConfig.key === "mode" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.userId}
                  className="hover:bg-teal-100 transition-colors"
                >
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.userId)}
                      onChange={() => {
                        setSelectedUsers((prev) =>
                          prev.includes(user.userId)
                            ? prev.filter((id) => id !== user.userId)
                            : [...prev, user.userId]
                        );
                      }}
                    />
                  </td>
                  <td style={styles.td}>{user.userId.slice(0, 8)}...</td>
                  <td style={styles.td}>
                    {editingUserId === user.userId ? (
                      <input
                        style={styles.input}
                        value={editedUserData.profileName || ""}
                        onChange={(e) =>
                          handleInputChange("profileName", e.target.value)
                        }
                      />
                    ) : (
                      user.profileName
                    )}
                  </td>
                  <td style={styles.td}>
                    {user.lastLogin !== "N/A"
                      ? new Date(user.lastLogin).toLocaleString()
                      : "N/A"}
                  </td>
                  <td style={styles.td}>
                    {editingUserId === user.userId ? (
                      <input
                        style={styles.input}
                        type="number"
                        value={editedUserData.points || ""}
                        onChange={(e) =>
                          handleInputChange("points", e.target.value)
                        }
                      />
                    ) : (
                      `${user.points} / ${user.pointsTotal}`
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUserId === user.userId ? (
                      <input
                        style={styles.input}
                        type="number"
                        value={editedUserData.mpoints || ""}
                        onChange={(e) =>
                          handleInputChange("mpoints", e.target.value)
                        }
                      />
                    ) : (
                      `${user.mpoints} / ${user.mpointsTotal}`
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUserId === user.userId ? (
                      <select
                        style={styles.select}
                        value={editedUserData.mode || ""}
                        onChange={(e) =>
                          handleInputChange("mode", e.target.value)
                        }
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    ) : (
                      user.mode
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUserId === user.userId ? (
                      <>
                        <button
                          style={{ ...styles.button, ...styles.saveButton }}
                          onClick={() => handleSaveUserEdit(user.userId)}
                        >
                          Save
                        </button>
                        <button
                          style={{ ...styles.button, ...styles.cancelButton }}
                          onClick={handleCancelUserEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          style={{ ...styles.button, ...styles.editButton }}
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...styles.button, ...styles.deleteButton }}
                          onClick={() =>
                            handleDeleteUser(user.userId, user.profileName)
                          }
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No users found.</p>
        )}
      </div>

      {/* Global Tasks Section */}
      <div style={styles.card}>
        <h3 style={{ ...styles.title, fontSize: "1.2rem" }}>Global Tasks</h3>
        {Object.keys(globalTasks).length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Task ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Daily Limit</th>
                <th style={styles.th}>Number Limit</th>
                <th style={styles.th}>Points</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(globalTasks).map((taskId) => (
                <tr
                  key={taskId}
                  className="hover:bg-teal-100 transition-colors"
                >
                  <td style={styles.td}>{taskId}</td>
                  <td style={styles.td}>
                    {editingTaskId === taskId ? (
                      <input
                        style={styles.input}
                        value={editedTaskData.name || ""}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value, false, true)
                        }
                      />
                    ) : (
                      globalTasks[taskId].name
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingTaskId === taskId ? (
                      <select
                        style={styles.select}
                        value={editedTaskData.category || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "category",
                            e.target.value,
                            false,
                            true
                          )
                        }
                      >
                        <option value="Task">Task</option>
                        <option value="Bonus">Bonus</option>
                      </select>
                    ) : (
                      globalTasks[taskId].category
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingTaskId === taskId ? (
                      <input
                        style={styles.input}
                        type="number"
                        value={editedTaskData.dailyLimit || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "dailyLimit",
                            e.target.value,
                            false,
                            true
                          )
                        }
                      />
                    ) : (
                      globalTasks[taskId].dailyLimit
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingTaskId === taskId ? (
                      <input
                        style={styles.input}
                        type="number"
                        value={editedTaskData.numberLimit || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "numberLimit",
                            e.target.value,
                            false,
                            true
                          )
                        }
                      />
                    ) : (
                      globalTasks[taskId].numberLimit
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingTaskId === taskId ? (
                      <input
                        style={styles.input}
                        type="number"
                        value={editedTaskData.points || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "points",
                            e.target.value,
                            false,
                            true
                          )
                        }
                      />
                    ) : (
                      globalTasks[taskId].points
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingTaskId === taskId ? (
                      <>
                        <button
                          style={{ ...styles.button, ...styles.saveButton }}
                          onClick={() => handleSaveTaskEdit(taskId)}
                        >
                          Save
                        </button>
                        <button
                          style={{ ...styles.button, ...styles.cancelButton }}
                          onClick={handleCancelTaskEdit}
                        >
                          Cancel
                        </button>
                        <div style={{ marginTop: "10px" }}>
                          <label>Frequency Unit:</label>
                          <select
                            style={styles.select}
                            value={editedTaskData.frequencyUnit || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "frequencyUnit",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          >
                            <option value="days">Days</option>
                            <option value="times">Times</option>
                          </select>
                        </div>
                        <div>
                          <label>Has Exceptional Option:</label>
                          <input
                            type="checkbox"
                            checked={
                              editedTaskData.hasExceptionalOption || false
                            }
                            onChange={(e) =>
                              handleInputChange(
                                "hasExceptionalOption",
                                e.target.checked,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Has Times Option:</label>
                          <input
                            type="checkbox"
                            checked={editedTaskData.hasTimesOption || false}
                            onChange={(e) =>
                              handleInputChange(
                                "hasTimesOption",
                                e.target.checked,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Penalty:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={editedTaskData.penalty || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "penalty",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Penalty Points:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={editedTaskData.penaltyPoints || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "penaltyPoints",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Selected Mode:</label>
                          <select
                            style={styles.select}
                            value={editedTaskData.selectedMode || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "selectedMode",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          >
                            <option value="normal">Normal</option>
                            <option value="exceptional">Exceptional</option>
                            <option value="penalty">Penalty</option>
                          </select>
                        </div>
                        <div>
                          <label>Summary:</label>
                          <input
                            style={styles.input}
                            value={editedTaskData.summary || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "summary",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Weekly Frequency:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={editedTaskData.weeklyFrequency || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "weeklyFrequency",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Level:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={editedTaskData.level || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "level",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Max Level:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={editedTaskData.maxLevel || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "maxLevel",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Required Completions for Next Level:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={
                              editedTaskData.requiredCompletionsForNextLevel ||
                              ""
                            }
                            onChange={(e) =>
                              handleInputChange(
                                "requiredCompletionsForNextLevel",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Required Completions:</label>
                          <input
                            style={styles.input}
                            type="number"
                            value={editedTaskData.requiredCompletions || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "requiredCompletions",
                                e.target.value,
                                false,
                                true
                              )
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <button
                        style={{ ...styles.button, ...styles.editButton }}
                        onClick={() => handleEditTask(taskId)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No global tasks found.</p>
        )}
      </div>

      {/* Admin Messages Section */}
      <div style={styles.card}>
        <h3 style={{ ...styles.title, fontSize: "1.2rem" }}>Admin Messages</h3>
        <button style={styles.bulkButton} onClick={handleAddMessageToAllUsers}>
          Add Message to All Users
        </button>
        {filteredUsers.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User ID</th>
                <th style={styles.th}>Profile Name</th>
                <th style={styles.th}>Message</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.userId}
                  className="hover:bg-teal-100 transition-colors"
                >
                  <td style={styles.td}>{user.userId.slice(0, 8)}...</td>
                  <td style={styles.td}>{user.profileName}</td>
                  <td style={styles.td}>
                    {editingMessageUserId === user.userId ? (
                      <textarea
                        style={{
                          ...styles.input,
                          height: "80px",
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #e0e0e0",
                          resize: "vertical",
                          fontSize: "14px",
                          fontFamily: '"Roboto", sans-serif', // Match app’s font
                        }}
                        value={editedMessageData.message || ""}
                        onChange={(e) =>
                          setEditedMessageData({ message: e.target.value })
                        }
                        placeholder="Enter the admin message"
                      />
                    ) : (
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        {user.adminMessage || "No message"}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingMessageUserId === user.userId ? (
                      <>
                        <button
                          style={{
                            ...styles.button,
                            ...styles.saveButton,
                            backgroundColor: "#007bff", // Match app’s primary color
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "4px",
                          }}
                          onClick={() => handleSaveMessageEdit(user.userId)}
                        >
                          Save
                        </button>
                        <button
                          style={{
                            ...styles.button,
                            ...styles.cancelButton,
                            backgroundColor: "#6c757d", // Neutral gray
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            marginLeft: "8px",
                          }}
                          onClick={handleCancelMessageEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        style={{
                          ...styles.button,
                          ...styles.editButton,
                          backgroundColor: "#28a745", // Green for edit
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "4px",
                        }}
                        onClick={() => handleEditMessage(user)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No users found.</p>
        )}
      </div>

      {/* Feedback Section */}
      <div style={styles.card}>
        <h3 style={{ ...styles.title, fontSize: "1.2rem" }}>User Feedback</h3>
        {feedbackData.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User ID</th>
                <th style={styles.th}>Feedback</th>
                <th style={styles.th}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {feedbackData.map((feedback, index) => (
                <tr key={index} className="hover:bg-teal-100 transition-colors">
                  <td style={styles.td}>{feedback.userId.slice(0, 8)}...</td>
                  <td style={styles.td}>{feedback.message}</td>
                  <td style={styles.td}>
                    {new Date(feedback.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No feedback found.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
