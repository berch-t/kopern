import {
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  widgetConfigDoc,
  slackConnectionDoc,
  type WidgetConfigDoc,
  type SlackConnectionDoc,
} from "@/lib/firebase/firestore";

// --- Widget Config ---

export async function getWidgetConfig(userId: string, agentId: string) {
  const snap = await getDoc(widgetConfigDoc(userId, agentId));
  if (!snap.exists()) return null;
  return snap.data() as WidgetConfigDoc;
}

export async function saveWidgetConfig(
  userId: string,
  agentId: string,
  data: Partial<Pick<WidgetConfigDoc, "enabled" | "welcomeMessage" | "position" | "showPoweredBy" | "allowedOrigins">>
) {
  const ref = widgetConfigDoc(userId, agentId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, {
      enabled: false,
      apiKeyHash: "",
      apiKeyPrefix: "",
      welcomeMessage: "",
      position: "bottom-right",
      showPoweredBy: true,
      allowedOrigins: [],
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function deleteWidgetConfig(userId: string, agentId: string) {
  await deleteDoc(widgetConfigDoc(userId, agentId));
}

// --- Slack Connection ---

export async function getSlackConnection(userId: string, agentId: string) {
  const snap = await getDoc(slackConnectionDoc(userId, agentId));
  if (!snap.exists()) return null;
  return snap.data() as SlackConnectionDoc;
}

export async function deleteSlackConnection(userId: string, agentId: string) {
  await deleteDoc(slackConnectionDoc(userId, agentId));
}
