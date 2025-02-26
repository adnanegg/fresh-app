import React, { useState} from "react";
import { auth, database } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set,get,child } from "firebase/database";
import { useNavigate,Link } from "react-router-dom";
import "./styles/Signup.css"
const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Add a name field
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate a random ID for the user (optional, you can use the UID from Firebase Auth)
      const userId = user.uid; // Use Firebase UID as the user ID
       // Fetch rank thresholds from the database
       const dbRef = ref(database);
       const snapshot = await get(child(dbRef, 'xpthresholds'));
       let initialRank = "Warrior";
       let initialRankImage = "../ranking-images/rank-warrior.png";
 
       if (snapshot.exists()) {
         const thresholds = snapshot.val();
         const sortedThresholds = Object.entries(thresholds).sort((a, b) => a[1] - b[1]);
         initialRank = sortedThresholds[0][0];
         initialRankImage = `../ranking-images/rank-${initialRank.toLowerCase()}.png`;
       }
      // Create a user document in the Realtime Database
      const userRef = ref(database, `users/${userId}`);
      await set(userRef, {
        profile: {
          name: name, // Use the name entered by the user
          photo: "../profile-photos/default-profile.png",
          rankName: initialRank,
          rankImage: initialRankImage, // Default profile photo
        },
        points: { current: 0, total: 1000 }, // Initialize points
        xp: { current: 0, level: 1 }, // Initialize XP
        tasks: [
          // Default tasks (replace with your config.tasks)
          { name: "Read 5 pages of a book ", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
            numberLimit: 7, frequencyUnit: "days", weeklyFrequency: 7,hasExceptionalOption: true, selectedMode: 'normal' },

          { name: "Quran : Read nissf hizb", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
            numberLimit: 7,frequencyUnit: "days", weeklyFrequency: 7,hasExceptionalOption: true, selectedMode: 'normal'   },

          { name: "Sport : Exercice for 20 min", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
            numberLimit: 3,frequencyUnit: "days", weeklyFrequency: 3,hasExceptionalOption: false  },

          { name: "Prayer At The Mosque", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
            numberLimit: 7,frequencyUnit: "times", requiredCompletions: 7,hasExceptionalOption: true, selectedMode: 'normal'   },

          { name: "listen to quoran", xp: 500, points: 10, category: "Task", penalty: 5,completionCount: 0,
            numberLimit: 2,frequencyUnit: "days", weeklyFrequency: 2,hasExceptionalOption: false   },

          { name: "15 Min Improvement", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
            numberLimit: 7,frequencyUnit: "days", weeklyFrequency: 7,hasExceptionalOption: false   },

          { name: "Wake up early", xp: 500, points: 10, category: "Task", penalty: 5,completionCount: 0,
            numberLimit: 6,frequencyUnit: "days", weeklyFrequency: 6,hasExceptionalOption: false  }, 

          { name: "الشفع و الوتر", xp: 300, points: 40, category: "Bonus", penalty: 5,completionCount: 0,
            numberLimit: 5,frequencyUnit: "days", weeklyFrequency: 5,hasExceptionalOption: false  },

          { name: "Presentation", xp: 1000, points: 50, category: "Bonus", penalty: 5,completionCount: 0,
            numberLimit: 1.,frequencyUnit: "days", weeklyFrequency: 1,hasExceptionalOption: false  },

          { name: "One day no social Media", xp: 1000, points: 30, category: "Bonus", penalty: 5,completionCount: 0,
            numberLimit: 1,frequencyUnit: "days", weeklyFrequency: 1,hasExceptionalOption: false },

          { name: "ختم القرأن", xp: 2000, points: 30, category: "Bonus", penalty: 5,completionCount: 0,
            numberLimit: 1,frequencyUnit: "days", weeklyFrequency: 1 ,hasExceptionalOption: false },

          { name: "Attend the Weekly meeting", xp: 300, points: 10, category: "Bonus", penalty: 5,completionCount: 0,
            numberLimit: 1,frequencyUnit: "days", weeklyFrequency: 1,hasExceptionalOption: false  },

          // { name: "Quran Exception", xp: 250, points: 5, category: "Task", penalty: 5,completionCount: 0,
          //   numberLimit: 7,frequencyUnit: "days", weeklyFrequency: 7,hasExceptionalOption: true, selectedMode: 'normal'   },

          // { name: "Book Exception", xp: 250, points: 5, category: "Task", penalty: 5,completionCount: 0,
          //   numberLimit: 7,frequencyUnit: "days", weeklyFrequency: 7   },

          // { name: "Prayer Exception", xp: 250, points: 5, category: "Task", penalty: 5,completionCount: 0,
          //   numberLimit: 7,frequencyUnit: "times", requiredCompletions: 7 },
          // Add more tasks as needed
        ],
        rankedTasks : [
          {taskId:"book_read", name: "Read 5 pages of a book ", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10,completionCount: 0 },

          {taskId:"quran_read", name: "Quran : Read nissf hizb", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
              },

          {taskId:"sport_exercise", name: "Sport : Exercice for 20 min", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, penalty: 5,completionCount: 0,
            },

          {taskId:"prayer_mosque", name: "Prayer At The Mosque", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, completionCount: 0,
            },

          {taskId:"listen_to_quoran", name: "listen to quoran", xp: 500, points: 10, category: "Task", completionCount: 0,
      },

          {taskId:"improvement", name: "15 Min Improvement", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10,completionCount: 0,
    },

          {taskId:"Wake_up_early" ,name: "Wake up early", xp: 500, points: 10, category: "Task",level: 1,maxLevel: 3,requiredCompletionsForNextLevel:10, completionCount: 0, }, 

          { name: "الشفع و الوتر", xp: 300, points: 40, category: "Bonus"
           },

          {name: "Presentation", xp: 1000, points: 50, category: "Bonus", penalty: 5,completionCount: 0,
            },

          {taskId:"One_day_no_social_media", name: "One day no social Media", xp: 1000, points: 30, category: "Bonus", penalty: 5,completionCount: 0,
           },

          { name: "ختم القرأن", xp: 2000, points: 30, category: "Bonus", penalty: 5,completionCount: 0,
          },

          {taskId:"Attend_the_weekly_meeting" ,name: "Attend the Weekly meeting", xp: 300, points: 10, category: "Bonus", penalty: 5,completionCount: 0, },
        ],
        completedTasks: [],
        hasStartedRanked: false,
      });

      // Redirect to the dashboard after signup
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="signup-container">
      <video
        autoPlay
        loop
        muted
        className="video-background"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      >
        <source src="/videos/backvideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    <div className="signup-card">
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
          <button type="submit" className="signup-button">
            Sign Up
          </button>
        </form>
        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;