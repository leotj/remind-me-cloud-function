import * as functions from "firebase-functions";
import axios from "axios";
import * as dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, QuerySnapshot } from "firebase-admin/firestore";

dotenv.config();
initializeApp();

type Reminders = {
  category: string;
  message: string;
};

export const sendReminder = functions.https.onRequest(
  async (_request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");

    if (
      !process.env.ZULIP_BOT_EMAIL_ADDRESS ||
      !process.env.ZULIP_BOT_API_KEY ||
      !process.env.ZULIP_PERSONAL_EMAIL ||
      !process.env.ZULIP_API_HOST
    ) {
      functions.logger.error("Environment variables are not set");
      return;
    }

    try {
      const reminderSnapshot = (await getFirestore()
        .collection("reminders")
        .get()) as QuerySnapshot<Reminders>;

      const randomizedIndex = Math.floor(
        Math.random() * (reminderSnapshot.size + 1)
      );

      await axios.post(
        `${process.env.ZULIP_API_HOST}/api/v1/messages`,
        {
          type: "direct",
          to: process.env.ZULIP_PERSONAL_EMAIL,
          content: reminderSnapshot.docs[randomizedIndex].data().message,
        },
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          auth: {
            username: process.env.ZULIP_BOT_EMAIL_ADDRESS,
            password: process.env.ZULIP_BOT_API_KEY,
          },
        }
      );
    } catch (error) {
      functions.logger.error("Error", error);
    }
  }
);
