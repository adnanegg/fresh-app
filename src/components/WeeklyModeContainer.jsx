import React, { useEffect } from "react";
import { isMobile } from "react-device-detect";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import WeeklyMode from "./WeeklyMode";
import WeeklyModeMobile from "./WeeklyModeMobile";

const WeeklyModeContainer = ({ globalTasks, refreshGlobalTasks }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
    }
  }, [navigate]);

  return isMobile ? (
    <WeeklyModeMobile
      globalTasks={globalTasks}
      refreshGlobalTasks={refreshGlobalTasks}
    />
  ) : (
    <WeeklyMode
      globalTasks={globalTasks}
      refreshGlobalTasks={refreshGlobalTasks}
    />
  );
};

export default WeeklyModeContainer;
