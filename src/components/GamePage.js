import React, { useState, useEffect, useCallback } from "react";
import { auth, database } from "../firebase";
import { ref, get, update, set, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Confetti from "react-confetti";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/style.css";

const GamePage = () => {
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;
  const isAdmin = auth.currentUser?.email === "admin@gmail.com";
  const [userData, setUserData] = useState({
    name: "User",
    points: { current: 0 },
  });
  const [nickname, setNickname] = useState("");
  const [betPoints, setBetPoints] = useState("");
  const [gameState, setGameState] = useState("betting");
  const [bets, setBets] = useState({});
  const [winners, setWinners] = useState(null);
  const [hasBet, setHasBet] = useState(false);
  const [inArena, setInArena] = useState(false);
  const [participants, setParticipants] = useState({});
  const [claimed, setClaimed] = useState({});

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin");
    }
  }, [navigate, isAdmin]);

  const playSound = (type) => {
    const audio = new Audio(
      type === "bet"
        ? "/sounds/bet.mp3"
        : type === "start"
        ? "/sounds/start.mp3"
        : "/sounds/win.mp3"
    );
    audio.play().catch((err) => console.log("Audio error:", err));
  };

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    const data = snapshot.val() || {
      profile: { name: "User" },
      points: { current: 0 },
    };
    setUserData({ name: data.profile.name, points: data.points });
    setNickname(data.profile.name);
  }, [userId]);

  useEffect(() => {
    fetchUserData();
    const gameRef = ref(database, "game");
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val() || {};
      setBets(data.bets || {});
      setWinners(data.winners || null);
      setGameState(data.state || "betting");
      setHasBet(!!data.bets?.[userId]);
      setParticipants(data.participants || {});
      setInArena(data.participants?.[userId] || false);
      setClaimed(data.claimed || {});

      if (
        data.state === "celebration" &&
        data.winners &&
        !data.claimed?.[userId] &&
        Object.values(data.winners).some((winner) => winner.userId === userId)
      ) {
        const prize = Object.values(data.winners).find(
          (w) => w.userId === userId
        ).prize;
        Swal.fire({
          title: "You Won!",
          text: `You've won ${prize} points! Claim your reward?`,
          icon: "success",
          confirmButtonText: "Claim Now",
          showCancelButton: true,
          cancelButtonText: "Later",
        }).then((result) => {
          if (result.isConfirmed) {
            claimPrize();
          }
        });
      }
    });
    return () => unsubscribe();
  }, [fetchUserData, userId]);

  const handleBet = async () => {
    if (
      !nickname ||
      !betPoints ||
      betPoints <= 0 ||
      betPoints > userData.points.current
    ) {
      Swal.fire({
        icon: "error",
        title: "Invalid Bet",
        text: "Please enter a valid nickname and bet amount within your points!",
      });
      return;
    }
    const result = await Swal.fire({
      title: "Confirm Bet",
      text: `Place a bet of ${betPoints} points? This will be deducted from your current points (${userData.points.current}).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    });
    if (result.isConfirmed) {
      playSound("bet");
      const gameRef = ref(database, "game");
      const userRef = ref(database, `users/${userId}`);
      const newPoints = userData.points.current - parseInt(betPoints);
      await update(userRef, {
        points: { ...userData.points, current: newPoints },
      });
      await update(gameRef, {
        bets: { ...bets, [userId]: { nickname, points: parseInt(betPoints) } },
      });
      setHasBet(true);
      setUserData({
        ...userData,
        points: { ...userData.points, current: newPoints },
      });
    }
  };

  const changeBet = async () => {
    const result = await Swal.fire({
      title: "Change Your Bet?",
      text: "This will cost 10 points and allow you to place a new bet. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    });
    if (result.isConfirmed) {
      const userRef = ref(database, `users/${userId}`);
      const newPoints = userData.points.current - 10;
      if (newPoints < 0) {
        Swal.fire({
          icon: "error",
          title: "Insufficient Points",
          text: "You don’t have enough points to change your bet!",
        });
        return;
      }
      await update(userRef, {
        points: { ...userData.points, current: newPoints },
      });
      setUserData({
        ...userData,
        points: { ...userData.points, current: newPoints },
      });
      setHasBet(false);
      Swal.fire({
        icon: "success",
        title: "Bet Reset",
        text: "You can now place a new bet (10 points deducted).",
      });
    }
  };

  const enterArena = async () => {
    if (!hasBet) {
      Swal.fire({
        icon: "warning",
        title: "No Bet Placed",
        text: "Please place a bet before entering!",
      });
      return;
    }
    playSound("start");
    const gameRef = ref(database, "game");
    await update(gameRef, {
      participants: { ...participants, [userId]: true },
    });
    setInArena(true);
  };

  const claimPrize = async () => {
    if (!winners || !Object.values(winners).some((w) => w.userId === userId))
      return;
    const prize = Object.values(winners).find((w) => w.userId === userId).prize;
    const userRef = ref(database, `users/${userId}`);
    const newPoints = userData.points.current + prize;
    const newMpoints = (userData.Mpoints?.current || 0) + prize / 2;
    await update(userRef, {
      points: { ...userData.points, current: newPoints },
      Mpoints: { ...userData.Mpoints, current: newMpoints },
    });
    const gameRef = ref(database, "game");
    const updatedClaimed = { ...claimed, [userId]: true };
    await update(gameRef, { claimed: updatedClaimed });
    setClaimed(updatedClaimed);
    playSound("win");
    Swal.fire({
      icon: "success",
      title: "Prize Claimed!",
      text: `You won ${prize} points!`,
    });
    resetGame(updatedClaimed); // Fixed: Replaced checkResetGame with resetGame
  };

  const exitCelebration = async () => {
    const gameRef = ref(database, "game");
    const snapshot = await get(gameRef);
    const data = snapshot.val() || {};
    const updatedParticipants = { ...data.participants };
    delete updatedParticipants[userId];
    await update(gameRef, { participants: updatedParticipants });
    resetGame(data.claimed || {});
    navigate("/dashboard");
  };

  const resetGame = async (currentClaimed) => {
    const allClaimedOrExited = Object.values(winners || {}).every(
      (winner) => currentClaimed[winner.userId] || !participants[winner.userId]
    );
    if (allClaimedOrExited || !isWinner) {
      const gameRef = ref(database, "game");
      await set(gameRef, {
        state: "betting",
        bets: {},
        participants: {},
        winners: null,
        rewards: calculateRewards(totalPool),
        claimed: {},
      });
    }
  };

  const totalPool = Object.values(bets).reduce(
    (sum, bet) => sum + bet.points,
    0
  );
  const calculateRewards = (pool) => ({
    first: Math.floor(pool * 0.5),
    second: Math.floor(pool * 0.3),
    third: Math.floor(pool * 0.2),
  });
  const rewards = calculateRewards(totalPool);

  const selectWinner = async (position, selectedUserId) => {
    const gameRef = ref(database, "game");
    const currentWinners = winners || {};
    const newWinners = {
      ...currentWinners,
      [position]: { userId: selectedUserId, prize: rewards[position] },
    };
    await update(gameRef, { winners: newWinners });
    if (position === "third") {
      await update(gameRef, { state: "celebration" });
    }
  };

  const isWinner = winners
    ? Object.values(winners).some((winner) => winner.userId === userId)
    : false;

  const styles = {
    container: {
      minHeight: "100vh",
      padding: "20px",
      background: "linear-gradient(135deg, #1e1e1e, #4a4a4a)",
    },
    bettingCard: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "15px",
      padding: "40px",
      textAlign: "center",
      color: "#fff",
      boxShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
      animation: "pulseGlow 2s infinite",
      backdropFilter: "blur(10px)",
    },
    arenaCard: {
      background: "rgba(40, 167, 69, 0.9)",
      borderRadius: "15px",
      padding: "30px",
      color: "#fff",
      boxShadow: "0 0 30px rgba(40, 167, 69, 0.5)",
      animation: "fadeIn 1s ease-in",
    },
    celebrationCard: {
      background: "linear-gradient(135deg, #ffd700, #ff4500)",
      borderRadius: "15px",
      padding: "40px",
      textAlign: "center",
      color: "#fff",
      boxShadow: "0 0 40px rgba(255, 215, 0, 0.7)",
    },
    loserCard: {
      background: "linear-gradient(135deg, #4a4a4a, #1e1e1e)",
      borderRadius: "15px",
      padding: "40px",
      textAlign: "center",
      color: "#fff",
      boxShadow: "0 0 20px rgba(255, 0, 0, 0.5)",
    },
    input: {
      padding: "12px",
      margin: "10px 0",
      borderRadius: "8px",
      border: "2px solid #ffd700",
      width: "250px",
      background: "rgba(255, 255, 255, 0.8)",
      color: "#333",
      fontSize: "16px",
      transition: "transform 0.3s, box-shadow 0.3s",
    },
    button: {
      padding: "12px 25px",
      background: "linear-gradient(135deg, #28a745, #218838)",
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
    pool: {
      marginTop: "20px",
      padding: "15px",
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: "10px",
      fontSize: "18px",
      animation: "fadeIn 0.5s ease-in",
    },
    pole: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: "20px",
    },
    poleItem: {
      background: "rgba(255, 255, 255, 0.2)",
      padding: "15px",
      margin: "10px 0",
      borderRadius: "10px",
      width: "90%",
      textAlign: "center",
      transition: "transform 0.3s, background 0.3s",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
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
    .input:focus { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); }
    .poleItem:hover { transform: scale(1.05); background: rgba(255, 255, 255, 0.3); }
    .winnerBadge.gold { background: #ffd700; color: #333; }
    .winnerBadge.silver { background: #c0c0c0; color: #333; }
    .winnerBadge.bronze { background: #cd7f32; color: #fff; }
  `;

  return (
    <div style={styles.container}>
      <style>{stylesString}</style>
      {gameState === "betting" && (
        <div style={styles.bettingCard}>
          <h1>Welcome to the Betting Arena!</h1>
          <p>Place your bet and join the fray!</p>
          {!hasBet ? (
            <>
              <input
                style={styles.input}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="input"
              />
              <input
                style={styles.input}
                type="number"
                value={betPoints}
                onChange={(e) => setBetPoints(e.target.value)}
                placeholder={`Bet points (Max: ${userData.points.current})`}
                className="input"
              />
              <button
                style={styles.button}
                onClick={handleBet}
                className="button"
              >
                Place Bet
              </button>
            </>
          ) : (
            <button
              style={styles.button}
              onClick={changeBet}
              className="button"
            >
              Change Your Bet (-10 points)
            </button>
          )}
          <button
            style={{ ...styles.button }}
            onClick={enterArena}
            disabled={!hasBet}
            className="button"
          >
            Enter Arena
          </button>
          <div style={styles.pool}>
            <h3>Prize Pool: {totalPool} points</h3>
            <p>
              1st: {rewards.first} | 2nd: {rewards.second} | 3rd:{" "}
              {rewards.third}
            </p>
            {Object.entries(bets).map(([id, { nickname, points }]) => (
              <p key={id}>
                {nickname}: {points} points{" "}
                {participants[id] ? "(In Arena)" : "(Waiting)"}
              </p>
            ))}
          </div>
        </div>
      )}
      {inArena && gameState === "arena" && (
        <div style={styles.arenaCard}>
          <h1>The Arena</h1>
          <p>Battle for Glory!</p>
          <div style={styles.pool}>
            <h3>Prize Pool: {totalPool} points</h3>
            <p>
              1st: {rewards.first} | 2nd: {rewards.second} | 3rd:{" "}
              {rewards.third}
            </p>
          </div>
          <div style={styles.pole}>
            {Object.entries(bets).map(([id, { nickname, points }]) => (
              <div key={id} style={styles.poleItem} className="poleItem">
                {nickname}: {points} points
                {isAdmin && !winners?.third && (
                  <>
                    {!winners?.first && (
                      <button
                        style={styles.button}
                        onClick={() => selectWinner("first", id)}
                      >
                        1st
                      </button>
                    )}
                    {winners?.first && !winners?.second && (
                      <button
                        style={styles.button}
                        onClick={() => selectWinner("second", id)}
                      >
                        2nd
                      </button>
                    )}
                    {winners?.second && !winners?.third && (
                      <button
                        style={styles.button}
                        onClick={() => selectWinner("third", id)}
                      >
                        3rd
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {gameState === "celebration" && winners && (
        <>
          {isWinner ? (
            <div style={styles.celebrationCard}>
              <Confetti width={window.innerWidth} height={window.innerHeight} />
              <h1>Celebration Time!</h1>
              <p>
                You Won{" "}
                {Object.values(winners).find((w) => w.userId === userId).prize}{" "}
                Points!
              </p>
              <p>Results:</p>
              <p className="winner">
                1st Place: {bets[winners.first?.userId]?.nickname || "Unknown"}{" "}
                - {winners.first?.prize} points
              </p>
              <p className="winner">
                2nd Place: {bets[winners.second?.userId]?.nickname || "Unknown"}{" "}
                - {winners.second?.prize} points
              </p>
              <p className="winner">
                3rd Place: {bets[winners.third?.userId]?.nickname || "Unknown"}{" "}
                - {winners.third?.prize} points
              </p>
              {!claimed[userId] && (
                <button
                  style={styles.button}
                  onClick={claimPrize}
                  className="button"
                >
                  Claim Your Prize (
                  {
                    Object.values(winners).find((w) => w.userId === userId)
                      .prize
                  }{" "}
                  points)
                </button>
              )}
              <button
                style={styles.button}
                onClick={exitCelebration}
                className="button"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <div style={styles.loserCard}>
              <h1>Game Over</h1>
              <p>Better luck next time!</p>
              <p>Results:</p>
              <p className="winner">
                1st Place: {bets[winners.first?.userId]?.nickname || "Unknown"}{" "}
                - {winners.first?.prize} points
              </p>
              <p className="winner">
                2nd Place: {bets[winners.second?.userId]?.nickname || "Unknown"}{" "}
                - {winners.second?.prize} points
              </p>
              <p className="winner">
                3rd Place: {bets[winners.third?.userId]?.nickname || "Unknown"}{" "}
                - {winners.third?.prize} points
              </p>
              <button
                style={styles.button}
                onClick={exitCelebration}
                className="button"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GamePage;
