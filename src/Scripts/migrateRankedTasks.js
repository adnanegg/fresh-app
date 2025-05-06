// migrateRankedTasks.js

// Load environment variables from a .env file
require("dotenv").config();

// Import Firebase Admin SDK and required modules
const admin = require("firebase-admin");

// Import the RANKED_TASKS constant (adjust the path based on your project structure)
const { RANKED_TASKS } = require("../components/ranked-constants/rankedTasks"); // Replace with the correct path

// Initialize Firebase Admin SDK with service account and database URL
const serviceAccount = require(process.env.SERVICE_ACCOUNT_KEY_PATH ||
  "../serviceAccountKey.json");
const databaseURL =
  process.env.DATABASE_URL ||
  "https://task-game-65770-default-rtdb.europe-west1.firebasedatabase.app/"; // Replace with your database URL

// Initialize the Firebase Admin app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL,
});

// Get the Realtime Database instance
const database = admin.database();

async function migrateRankedTasksForAllUsers() {
  try {
    const usersRef = database.ref("users");
    const snapshot = await usersRef.once("value");
    const users = snapshot.val();

    if (!users) {
      console.log("No users found in the database.");
      return;
    }

    console.log("Migrating rankedTasks for all users...");

    for (const userId of Object.keys(users)) {
      const userRef = database.ref(`users/${userId}`);
      const userSnapshot = await userRef.once("value");
      const userData = userSnapshot.val();

      // Initialize or update rankedTasks
      if (!userData.rankedTasks || !Array.isArray(userData.rankedTasks)) {
        console.log(`Initializing rankedTasks for user ${userId}`);
        await userRef.update({ rankedTasks: RANKED_TASKS });
      } else {
        console.log(`Merging rankedTasks for user ${userId}`);
        const existingRankedTasks = userData.rankedTasks || [];
        const updatedRankedTasks = mergeRankedTasks(
          existingRankedTasks,
          RANKED_TASKS
        );
        await userRef.update({ rankedTasks: updatedRankedTasks });
      }
    }

    console.log("RankedTasks migration complete for all users.");
  } catch (error) {
    console.error("Error migrating rankedTasks:", error);
  }
}

/**
 * Merges existing user rankedTasks with the latest rankedTasks from the config file,
 * preserving progress-related variables including level.
 * @param {Array} existingRankedTasks - The user's current rankedTasks from the database
 * @param {Array} latestRankedTasks - The latest rankedTasks from the config file
 * @returns {Array} - The merged rankedTasks array
 */
function mergeRankedTasks(existingRankedTasks, latestRankedTasks) {
  // Create a map of existing rankedTasks by taskId for quick lookup
  const existingRankedTasksMap = new Map();
  existingRankedTasks.forEach((task) => {
    existingRankedTasksMap.set(task.taskId, task);
  });

  // Merge rankedTasks, preserving progress variables for existing tasks
  const mergedRankedTasks = latestRankedTasks.map((latestTask) => {
    const existingTask = existingRankedTasksMap.get(latestTask.taskId);
    if (existingTask) {
      return {
        ...latestTask, // Start with the latest ranked task definition
        completionCount: existingTask.completionCount || 0, // Preserve total completions
        boost: existingTask.boost || null, // Preserve user-applied boost
        level: existingTask.level || latestTask.level || 1, // Preserve user's current level
      };
    }
    return latestTask;
  });

  return mergedRankedTasks;
}

// Execute the migration function
migrateRankedTasksForAllUsers();
