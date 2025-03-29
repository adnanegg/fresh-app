// migrateTasks.js

// Load environment variables from a .env file
require("dotenv").config();

// Import Firebase Admin SDK and required modules
const admin = require("firebase-admin");

// Import the TASKS constant (adjust the path based on your project structure)
const { TASKS } = require("../components/tasks"); // Replace with the correct path to your tasks config file

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

async function migrateTasksForAllUsers() {
  try {
    const usersRef = database.ref("users");
    const snapshot = await usersRef.once("value");
    const users = snapshot.val();

    if (!users) {
      console.log("No users found in the database.");
      return;
    }

    console.log("Migrating tasks for all users...");

    for (const userId of Object.keys(users)) {
      const userRef = database.ref(`users/${userId}`);
      const userSnapshot = await userRef.once("value");
      const userData = userSnapshot.val();

      // Initialize tasks if missing or not an array
      if (!userData.tasks || !Array.isArray(userData.tasks)) {
        console.log(`Initializing tasks for user ${userId}`);
        await userRef.update({ tasks: TASKS });
      } else {
        // If tasks exist, merge the latest tasks while preserving progress
        console.log(`Merging tasks for user ${userId}`);
        const existingTasks = userData.tasks || [];
        const updatedTasks = mergeTasks(existingTasks, TASKS);
        await userRef.update({ tasks: updatedTasks });
      }
    }

    console.log("Tasks migration complete for all users.");
  } catch (error) {
    console.error("Error migrating tasks:", error);
  }
}

/**
 * Merges existing user tasks with the latest tasks from the config file,
 * preserving progress-related variables.
 * @param {Array} existingTasks - The user's current tasks from the database
 * @param {Array} latestTasks - The latest tasks from the config file
 * @returns {Array} - The merged tasks array
 */
function mergeTasks(existingTasks, latestTasks) {
  // Create a map of existing tasks by name for quick lookup
  const existingTasksMap = new Map();
  existingTasks.forEach((task) => {
    existingTasksMap.set(task.name, task);
  });

  // Merge tasks, preserving progress variables for existing tasks
  const mergedTasks = latestTasks.map((latestTask) => {
    const existingTask = existingTasksMap.get(latestTask.name);
    if (existingTask) {
      // Preserve progress-related variables from the existing task
      return {
        ...latestTask, // Start with the latest task definition
        dailyCounter: existingTask.dailyCounter || 0, // Preserve daily counter
        completionCount: existingTask.completionCount || 0, // Preserve total completions
        boost: existingTask.boost || null, // Preserve user-applied boost
        selectedMode: existingTask.selectedMode || "normal", // Preserve user-selected mode
        hasTimesOption: existingTask.hasTimesOption || false, // Preserve times option (may be set by boosts)
      };
    }
    // If the task is new (not in existing tasks), include it as-is
    return latestTask;
  });

  // Optionally, preserve tasks that were removed from latestTasks but have progress
  existingTasks.forEach((existingTask) => {
    if (
      !latestTasks.some((latestTask) => latestTask.name === existingTask.name)
    ) {
      // Task was removed from the config file
      if (existingTask.completionCount > 0 || existingTask.dailyCounter > 0) {
        // Preserve the task if it has progress
        console.log(
          `Preserving removed task "${existingTask.name}" for user due to progress`
        );
        mergedTasks.push(existingTask);
      }
    }
  });

  return mergedTasks;
}

// Execute the migration function
migrateTasksForAllUsers();
