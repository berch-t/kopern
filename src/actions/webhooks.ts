import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  webhooksCollection,
  webhookDoc,
  webhookLogsCollection,
  type WebhookDoc,
  type WebhookLogDoc,
  type WebhookEventType,
} from "@/lib/firebase/firestore";

export async function createWebhook(
  userId: string,
  agentId: string,
  data: {
    name: string;
    type: "inbound" | "outbound";
    targetUrl?: string;
    secret?: string;
    events?: WebhookEventType[];
  }
) {
  const ref = await addDoc(webhooksCollection(userId, agentId), {
    name: data.name,
    type: data.type,
    enabled: true,
    secret: data.secret || null,
    targetUrl: data.targetUrl || null,
    events: data.events || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWebhook(
  userId: string,
  agentId: string,
  webhookId: string,
  data: Partial<Pick<WebhookDoc, "name" | "enabled" | "secret" | "targetUrl" | "events">>
) {
  await updateDoc(webhookDoc(userId, agentId, webhookId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWebhook(userId: string, agentId: string, webhookId: string) {
  await deleteDoc(webhookDoc(userId, agentId, webhookId));
}

export async function listWebhooks(userId: string, agentId: string) {
  const q = query(webhooksCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as (WebhookDoc & { id: string })[];
}

export async function getWebhook(userId: string, agentId: string, webhookId: string) {
  const snap = await getDoc(webhookDoc(userId, agentId, webhookId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WebhookDoc & { id: string };
}

export async function listWebhookLogs(userId: string, agentId: string, count = 50) {
  const q = query(webhookLogsCollection(userId, agentId), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as (WebhookLogDoc & { id: string })[];
}
