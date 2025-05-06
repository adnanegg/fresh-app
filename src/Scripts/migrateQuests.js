// Load environment variables from a .env file
require("dotenv").config();

// Import Firebase Admin SDK and required modules
const admin = require("firebase-admin");

// Import the QUESTS constant (adjust the path based on your project structure)
const { QUESTS } = require("../components/ranked-constants/quests"); // Replace with the correct path

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

async function migrateQuestsForAllUsers() {
  try {
    const usersRef = database.ref("users");
    const snapshot = await usersRef.once("value");
    const users = snapshot.val();

    if (!users) {
      console.log("No users found in the database.");
      return;
    }

    console.log("Migrating quests for all users...");

    for (const userId of Object.keys(users)) {
      const userRef = database.ref(`users/${userId}`);
      const userSnapshot = await userRef.once("value");
      const userData = userSnapshot.val();

      // Initialize quests if missing or not an object
      if (!userData.quests || typeof userData.quests !== "object") {
        console.log(`Initializing quests for user ${userId}`);
        await userRef.update({ quests: QUESTS });
      } else {
        // If quests exist, merge the latest quests while preserving progress
        console.log(`Merging quests for user ${userId}`);
        const existingQuests = userData.quests || {};
        const updatedQuests = mergeQuests(existingQuests, QUESTS);
        await userRef.update({ quests: updatedQuests });
      }
    }

    console.log("Quests migration complete for all users.");
  } catch (error) {
    console.error("Error migrating quests:", error);
  }
}

/**
 * Merges existing user quests with the latest quests from the config file,
 * preserving progress-related variables but keeping `completed` unchanged.
 * @param {Object} existingQuests - The user's current quests from the database
 * @param {Object} latestQuests - The latest quests from the config file
 * @returns {Object} - The merged quests object
 */
function mergeQuests(existingQuests, latestQuests) {
  const mergedQuests = {};

  // Merge quests, preserving progress-related variables
  for (const questId of Object.keys(latestQuests)) {
    const existingQuest = existingQuests[questId];
    if (existingQuest) {
      mergedQuests[questId] = {
        ...latestQuests[questId], // Start with the latest quest definition
        completed: existingQuest.completed || false, // Keep `completed` unchanged
      };
    } else {
      // If the quest is new, add it as-is
      mergedQuests[questId] = latestQuests[questId];
    }
  }

  return mergedQuests;
}

// Execute the migration function
migrateQuestsForAllUsers();
