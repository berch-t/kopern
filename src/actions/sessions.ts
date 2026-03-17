import {
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  sessionsCollection,
  sessionDoc,
  type SessionDoc,
  type SessionEvent,
} from "@/lib/firebase/firestore";

export async function createSession(
  userId: string,
  agentId: string,
  data: {
    purpose: string | null;
    modelUsed: string;
    providerUsed: string;
  }
) {
  const ref = await addDoc(sessionsCollection(userId, agentId), {
    ...data,
    startedAt: serverTimestamp(),
    endedAt: null,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalCost: 0,
    toolCallCount: 0,
    subAgentCallCount: 0,
    messageCount: 0,
    events: [],
  } as unknown as SessionDoc);
  return ref.id;
}

export async function updateSession(
  userId: string,
  agentId: string,
  sessionId: string,
  data: Partial<
    Pick<
      SessionDoc,
      | "endedAt"
      | "totalTokensIn"
      | "totalTokensOut"
      | "totalCost"
      | "toolCallCount"
      | "subAgentCallCount"
      | "messageCount"
      | "events"
    >
  >
) {
  await updateDoc(sessionDoc(userId, agentId, sessionId), data);
}

export async function endSession(userId: string, agentId: string, sessionId: string) {
  await updateDoc(sessionDoc(userId, agentId, sessionId), {
    endedAt: serverTimestamp(),
  });
}

export async function listSessions(userId: string, agentId: string, maxResults = 50) {
  const q = query(
    sessionsCollection(userId, agentId),
    orderBy("startedAt", "desc"),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getSession(userId: string, agentId: string, sessionId: string) {
  const snapshot = await getDoc(sessionDoc(userId, agentId, sessionId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as SessionDoc & { id: string };
}
