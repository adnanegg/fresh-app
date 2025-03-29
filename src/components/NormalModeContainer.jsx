import React, { useState, useEffect } from "react";
import { isMobile } from "react-device-detect";
import { ref, get } from "firebase/database";
import { database } from "../firebase";
import NormalMode from "./NormalMode";
import NormalModeMobile from "./NormalModeMobile";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const NormalModeContainer = () => {
  const [globalTasks, setGlobalTasks] = useState(
    JSON.parse(localStorage.getItem("globalTasks")) || {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
    }
  }, [navigate]);

  const refreshGlobalTasks = async () => {
    setIsLoading(true);
    try {
      const globalTasksRef = ref(database, "globalTasks");
      const snapshot = await get(globalTasksRef);
      const tasks = snapshot.val() || {};
      localStorage.setItem("globalTasks", JSON.stringify(tasks));
      setGlobalTasks(tasks);
      Swal.fire({
        icon: "success",
        title: "Global Tasks Updated",
        text: "Global tasks have been refreshed from the server.",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: `Failed to refresh global tasks: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return isMobile ? (
    <NormalModeMobile
      globalTasks={globalTasks}
      refreshGlobalTasks={refreshGlobalTasks}
    />
  ) : (
    <NormalMode
      globalTasks={globalTasks}
      refreshGlobalTasks={refreshGlobalTasks}
    />
  );
};

export default NormalModeContainer;
