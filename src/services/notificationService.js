import { ref, update, get } from "firebase/database";
import { database } from "../firebase";
import Swal from "sweetalert2";

class NotificationService {
  static async checkSubscriptionStatus(userId) {
    if (!userId) {
      console.warn("No userId provided for subscription check");
      return false;
    }

    try {
      const userRef = ref(database, `users/${userId}/notificationSubscribed`);
      const snapshot = await get(userRef);
      return snapshot.val() || false;
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return false;
    }
  }

  static async verifySubscription(userId) {
    if (!userId) {
      console.warn("No userId provided for subscription verification");
      return false;
    }

    try {
      const permission = Notification.permission;
      console.log("Verifying subscription - Permission status:", permission);

      if (permission !== "granted") {
        console.log("Permission not granted");
        return false;
      }

      const response = await fetch(
        `https://onesignal.com/api/v1/players?app_id=fb06cd63-59c3-44cd-951a-14a982e1727d&external_user_id=${userId}`,
        {
          headers: {
            Authorization:
              "Basic os_v2_app_7mdm2y2zyncm3fi2csuyfylspvvcgay3zsfujxfvbyybgmgomzxhu7ksnowrs4scxqkc46pomopg5fm3fykb2uvxjaznkj355lupzbq",
          },
        }
      );

      if (!response.ok) {
        console.error("OneSignal API error:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("OneSignal API response:", data);

      const isSubscribed =
        data.players?.some(
          (player) =>
            player.external_user_id === userId && player.subscription_enabled
        ) || false;

      console.log("Subscription status:", isSubscribed);

      const updates = {
        [`users/${userId}/notificationSubscribed`]: isSubscribed,
      };
      await update(ref(database), updates);

      return isSubscribed;
    } catch (error) {
      console.error("Subscription verification failed:", error);
      return false;
    }
  }

  static async initializeOneSignal(userId, autoPrompt = false) {
    if (!userId) {
      console.warn("No userId provided for OneSignal initialization");
      return false;
    }

    try {
      const isSubscribed = await this.checkSubscriptionStatus(userId);
      console.log("Current subscription status:", isSubscribed);

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register(
            "/OneSignalSDKWorker.js",
            {
              scope: "/",
            }
          );
          console.log("Service Worker registered successfully:", registration);
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      }

      if (!window.OneSignal) {
        await new Promise((resolve) => {
          const checkOneSignal = setInterval(() => {
            if (window.OneSignal) {
              clearInterval(checkOneSignal);
              resolve();
            }
          }, 100);
        });
      }

      if (isSubscribed) {
        console.log("User already subscribed, logging in with OneSignal");
        await window.OneSignal.login(userId);
        return true;
      }

      if (!window.OneSignal?.initialized) {
        await window.OneSignal.init({
          appId: "fb06cd63-59c3-44cd-951a-14a982e1727d",
          allowLocalhostAsSecureOrigin:
            window.location.hostname === "localhost",
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: autoPrompt,
                  text: {
                    actionMessage:
                      "Enable notifications to stay updated with your progress",
                    acceptButton: "Enable",
                    cancelButton: "Not Now",
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 0,
                  },
                },
              ],
            },
          },
        });
      }

      if (autoPrompt) {
        await window.OneSignal.login(userId);
        await window.OneSignal.Slidedown.promptPush();
      }

      return true;
    } catch (error) {
      console.error("OneSignal initialization failed:", error);
      return false;
    }
  }

  static async triggerSubscriptionPrompt(userId) {
    if (!userId) {
      console.warn("No userId provided for subscription prompt");
      return false;
    }

    try {
      const isSubscribed = await this.checkSubscriptionStatus(userId);
      if (isSubscribed) {
        Swal.fire({
          icon: "info",
          title: "Already Subscribed",
          text: "You are already subscribed to notifications.",
        });
        return false;
      }

      if (!window.OneSignal?.initialized) {
        await this.initializeOneSignal(userId, false);
      }

      await window.OneSignal.login(userId);
      await window.OneSignal.Slidedown.promptPush();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const permission = Notification.permission;
      if (permission === "granted") {
        const isNowSubscribed = await this.handleSuccessfulSubscription(userId);
        if (isNowSubscribed) {
          Swal.fire({
            icon: "success",
            title: "Subscribed!",
            text: "You have successfully subscribed to notifications.",
          });
        }
        return isNowSubscribed;
      } else {
        Swal.fire({
          icon: "info",
          title: "Subscription Cancelled",
          text: "You chose not to enable notifications.",
        });
        return false;
      }
    } catch (error) {
      console.error("Failed to trigger subscription prompt:", error);
      Swal.fire({
        icon: "error",
        title: "Subscription Failed",
        text: "Failed to enable notifications. Please try again.",
      });
      return false;
    }
  }

  static async handleSuccessfulSubscription(userId) {
    try {
      console.log("Setting external user ID:", userId);
      await window.OneSignal.login(userId);

      const isNowSubscribed = await this.verifySubscription(userId);
      console.log("Subscription verification result:", isNowSubscribed);

      const updates = {
        [`users/${userId}/notificationSubscribed`]: isNowSubscribed,
      };
      await update(ref(database), updates);

      return isNowSubscribed;
    } catch (error) {
      console.error("Failed to handle subscription:", error);
      return false;
    }
  }
}

export default NotificationService;
