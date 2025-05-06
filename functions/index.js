const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  // Check if the caller is authenticated and is the admin
  if (!context.auth || context.auth.token.email !== "admin@gmail.com") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Only admin can send push notifications.",
    );
  }

  const {userIds, title, body} = data;

  if (
    !userIds ||
    !Array.isArray(userIds) ||
    userIds.length === 0 ||
    !title ||
    !body
  ) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid input: userIds (array), title, and body are required.",
    );
  }

  try {
    // Fetch FCM tokens for the specified users
    const userSnapshots = await Promise.all(
        userIds.map((userId) =>
          admin.database().ref(`users/${userId}/fcmToken`).once("value"),
        ),
    );

    const messages = userSnapshots
        .map((snapshot, index) => {
          const fcmToken = snapshot.val();
          if (!fcmToken) return null;
          return {
            token: fcmToken,
            notification: {
              title,
              body,
            },
            webpush: {
              fcm_options: {
                link: data.link || "http://localhost:3000", // Replace with your app URL
              },
            },
          };
        })
        .filter((message) => message !== null);

    if (messages.length === 0) {
      throw new functions.https.HttpsError(
          "not-found",
          "No valid FCM tokens found for the selected users.",
      );
    }

    // Send notifications
    const responses = await admin.messaging().sendEach(messages);

    // Log admin action
    await admin
        .database()
        .ref("adminActions")
        .push({
          adminEmail: context.auth.token.email,
          action: "send_push_notification",
          details: {
            userIds,
            title,
            body,
            successfulUsers: userIds.filter(
                (_, i) => responses.responses[i].success,
            ),
          },
          timestamp: Date.now(),
        });

    return {
      success: true,
      message: `Sent notifications to ${messages.length} user(s).`,
      failedCount: responses.failureCount,
    };
  } catch (error) {
    console.error("Error sending push notifications:", error);
    throw new functions.https.HttpsError(
        "internal",
        `Failed to send notifications: ${error.message}`,
    );
  }
});
