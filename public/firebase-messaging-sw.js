// firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyD6bNrdiJ-eTsdevZrv_pwJrT9rmcJq9Ec",
  authDomain: "dinwadunya-e6d3b.firebaseapp.com",
  databaseURL:
    "https://dinwadunya-e6d3b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dinwadunya-e6d3b",
  storageBucket: "dinwadunya-e6d3b.firebasestorage.app",
  messagingSenderId: "771553708340",
  appId: "1:771553708340:web:9cd0ec5ce33bcf9d10fd61",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );
  const notificationTitle =
    payload.notification?.title || "Daily Tracker Reminder";
  const notificationOptions = {
    body:
      payload.notification?.body || "Don't forget to track your tasks today!",
    icon: "/trackerLogo.png",
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
