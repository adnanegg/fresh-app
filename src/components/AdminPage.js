import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, get, update, set, onValue } from "firebase/database";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/style.css";

const AdminPage = () => {
  const [bets, setBets] = useState({});
  const [participants, setParticipants] = useState({});
  const [winners, setWinners] = useState(null);
  const [gameState, setGameState] = useState("betting");
  const [rewards, setRewards] = useState({ first: 0, second: 0, third: 0 });

  // Sound effects
  const playSound = (type) => {
    const audio = new Audio(
      type === "win" ? "/sounds/win.mp3" : "/sounds/start.mp3"
    );
    audio.play().catch((err) => console.log("Audio error:", err));
  };

  // Fetch game data and calculate default rewards
  useEffect(() => {
    const gameRef = ref(database, "game");
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val() || {};
      setBets(data.bets || {});
      setParticipants(data.participants || {});
      setWinners(data.winners || null);
      setGameState(data.state || "betting");

      const totalPool = Object.values(data.bets || {}).reduce(
        (sum, bet) => sum + bet.points,
        0
      );
      const defaultRewards = {
        first: Math.floor(totalPool * 0.5),
        second: Math.floor(totalPool * 0.3),
        third: Math.floor(totalPool * 0.2),
      };
      setRewards(data.rewards || defaultRewards);
    });
    return () => unsubscribe();
  }, []);

  // Start arena phase
  const startArenaPhase = async () => {
    if (Object.keys(participants).length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Participants",
        text: "No users have entered the arena yet!",
      });
      return;
    }
    const gameRef = ref(database, "game");
    await update(gameRef, { state: "arena" });
    playSound("start");
    Swal.fire({
      icon: "success",
      title: "Arena Phase Started!",
      text: "The game is now in the arena phase.",
    });
  };

  // Set custom rewards
  const setCustomRewards = async () => {
    const totalPool = Object.values(bets).reduce(
      (sum, bet) => sum + bet.points,
      0
    );
    const defaultRewards = {
      first: Math.floor(totalPool * 0.5),
      second: Math.floor(totalPool * 0.3),
      third: Math.floor(totalPool * 0.2),
    };

    const { value: formValues } = await Swal.fire({
      title: "Set Rewards",
      html:
        `<input id="first" class="swal2-input" placeholder="1st Place Reward" type="number" min="1" value="${defaultRewards.first}">` +
        `<input id="second" class="swal2-input" placeholder="2nd Place Reward" type="number" min="1" value="${defaultRewards.second}">` +
        `<input id="third" class="swal2-input" placeholder="3rd Place Reward" type="number" min="1" value="${defaultRewards.third}">`,
      focusConfirm: false,
      preConfirm: () => {
        const first = parseInt(document.getElementById("first").value);
        const second = parseInt(document.getElementById("second").value);
        const third = parseInt(document.getElementById("third").value);
        if (
          !first ||
          !second ||
          !third ||
          first <= 0 ||
          second <= 0 ||
          third <= 0
        ) {
          Swal.showValidationMessage("Please enter valid reward amounts!");
          return false;
        }
        return { first, second, third };
      },
    });
    if (formValues) {
      const gameRef = ref(database, "game");
      await update(gameRef, { rewards: formValues });
      setRewards(formValues);
      Swal.fire({
        icon: "success",
        title: "Rewards Set!",
        text: `1st: ${formValues.first}, 2nd: ${formValues.second}, 3rd: ${formValues.third}`,
      });
    }
  };

  // Select winners with exclusivity
  const selectWinners = async (place, userId) => {
    const placeText = { first: "1st", second: "2nd", third: "3rd" };
    const result = await Swal.fire({
      title: `Select ${placeText[place]} Place`,
      text: `Assign ${bets[userId].nickname} as ${placeText[place]} place with ${rewards[place]} points?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      confirmButtonColor: "#ffd700",
    });
    if (result.isConfirmed) {
      const gameRef = ref(database, "game");
      await update(gameRef, {
        winners: { ...winners, [place]: { userId, prize: rewards[place] } },
      });
      playSound("win");
    }
  };

  // End game and transition to celebration
  const endGame = async () => {
    if (!winners || Object.keys(winners).length < 3) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Winners",
        text: "Please select all winners (1st, 2nd, 3rd) before ending the game!",
      });
      return;
    }
    const result = await Swal.fire({
      title: "End Game?",
      text: "This will move to the celebration phase and reset the game after users exit. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    });
    if (result.isConfirmed) {
      const gameRef = ref(database, "game");
      await update(gameRef, { state: "celebration" });
      Swal.fire({
        icon: "success",
        title: "Game Ended!",
        text: "The game is now in celebration phase.",
      });
    }
  };

  // Calculate total pool
  const totalPool = Object.values(bets).reduce(
    (sum, bet) => sum + bet.points,
    0
  );

  // Styles
  const styles = {
    container: {
      minHeight: "100vh",
      padding: "20px",
      background: "linear-gradient(135deg, #1e1e1e, #4a4a4a)",
      color: "#fff",
      textAlign: "center",
    },
    controlPanel: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "15px",
      padding: "30px",
      marginBottom: "20px",
      boxShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
      animation: "pulseGlow 2s infinite",
      backdropFilter: "blur(10px)",
    },
    pool: {
      background: "rgba(255, 255, 255, 0.15)",
      borderRadius: "10px",
      padding: "20px",
      margin: "20px auto",
      maxWidth: "600px",
      animation: "fadeIn 0.5s ease-in",
    },
    poleItem: {
      background: "rgba(255, 255, 255, 0.2)",
      padding: "15px",
      margin: "10px 0",
      borderRadius: "10px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      transition: "transform 0.3s",
      cursor: "pointer",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
    },
    button: {
      padding: "12px 25px",
      background: "linear-gradient(135deg, #ff4500, #dc3545)",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "transform 0.3s, box-shadow 0.3s",
      fontWeight: "bold",
      margin: "5px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
    },
    disabledButton: {
      background: "#666",
      cursor: "not-allowed",
      boxShadow: "none",
    },
    winnerBadge: {
      padding: "5px 15px",
      borderRadius: "20px",
      marginLeft: "10px",
      fontWeight: "bold",
      animation: "bounce 1s infinite",
    },
  };

  const stylesString = `
    @keyframes pulseGlow { 0% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); } 50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.5); } 100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); } }
    @keyframes fadeIn { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .button:hover { transform: scale(1.1); box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3); }
    .button:active { transform: scale(0.95); }
    .poleItem:hover { transform: scale(1.05); }
    .winnerBadge.gold { background: #ffd700; color: #333; }
    .winnerBadge.silver { background: #c0c0c0; color: #333; }
    .winnerBadge.bronze { background: #cd7f32; color: #fff; }
  `;

  return (
    <div style={styles.container}>
      <style>{stylesString}</style>
      <h1>Admin Control Panel</h1>
      <div style={styles.controlPanel}>
        <h2>Game Controls</h2>
        <button
          style={styles.button}
          onClick={setCustomRewards}
          className="button"
        >
          Set Rewards (Current: {rewards.first}, {rewards.second},{" "}
          {rewards.third})
        </button>
        <button
          style={{
            ...styles.button,
            ...(Object.keys(participants).length === 0 ||
            gameState !== "betting"
              ? styles.disabledButton
              : {}),
          }}
          onClick={startArenaPhase}
          disabled={
            Object.keys(participants).length === 0 || gameState !== "betting"
          }
          className="button"
        >
          Start Arena Phase
        </button>
        <button
          style={{
            ...styles.button,
            ...(gameState !== "arena" ||
            !winners ||
            Object.keys(winners).length < 3
              ? styles.disabledButton
              : {}),
          }}
          onClick={endGame}
          disabled={
            gameState !== "arena" || !winners || Object.keys(winners).length < 3
          }
          className="button"
        >
          End Game
        </button>
      </div>

      <div style={styles.pool}>
        <h3>Current Pool: {totalPool} points</h3>
        <h4>Betters</h4>
        {Object.entries(bets).map(([id, { nickname, points }]) => (
          <div key={id} style={styles.poleItem}>
            {nickname}: {points} points{" "}
            {participants[id] ? "(In Arena)" : "(Waiting)"}
          </div>
        ))}
        {gameState === "arena" && (
          <>
            <h4>Select Winners</h4>
            {Object.entries(bets).map(([id, { nickname, points }]) => (
              <div key={id} style={styles.poleItem} className="poleItem">
                {nickname}: {points} points
                <div>
                  <button
                    style={{ ...styles.button, background: "#ffd700" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectWinners("first", id);
                    }}
                    disabled={
                      winners?.first ||
                      winners?.second?.userId === id ||
                      winners?.third?.userId === id
                    }
                    className="button"
                  >
                    1st
                  </button>
                  <button
                    style={{ ...styles.button, background: "#c0c0c0" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectWinners("second", id);
                    }}
                    disabled={
                      winners?.second ||
                      winners?.first?.userId === id ||
                      winners?.third?.userId === id
                    }
                    className="button"
                  >
                    2nd
                  </button>
                  <button
                    style={{ ...styles.button, background: "#cd7f32" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectWinners("third", id);
                    }}
                    disabled={
                      winners?.third ||
                      winners?.first?.userId === id ||
                      winners?.second?.userId === id
                    }
                    className="button"
                  >
                    3rd
                  </button>
                </div>
                {winners?.first?.userId === id && (
                  <span style={styles.winnerBadge} className="winnerBadge gold">
                    1st
                  </span>
                )}
                {winners?.second?.userId === id && (
                  <span
                    style={styles.winnerBadge}
                    className="winnerBadge silver"
                  >
                    2nd
                  </span>
                )}
                {winners?.third?.userId === id && (
                  <span
                    style={styles.winnerBadge}
                    className="winnerBadge bronze"
                  >
                    3rd
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
