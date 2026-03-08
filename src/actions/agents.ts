import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  agentsCollection,
  agentDoc,
  type AgentDoc,
} from "@/lib/firebase/firestore";

export async function createAgent(
  userId: string,
  data: {
    name: string;
    description: string;
    domain: string;
    systemPrompt: string;
    modelProvider: string;
    modelId: string;
    thinkingLevel: AgentDoc["thinkingLevel"];
    builtinTools: string[];
  }
) {
  const ref = await addDoc(agentsCollection(userId), {
    ...data,
    connectedRepos: [],
    version: 1,
    isPublished: false,
    latestGradingScore: null,
    purposeGate: null,
    tillDone: null,
    branding: null,
    toolOverrides: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as AgentDoc);
  return ref.id;
}

export async function updateAgent(
  userId: string,
  agentId: string,
  data: Partial<
    Pick<
      AgentDoc,
      | "name"
      | "description"
      | "domain"
      | "systemPrompt"
      | "modelProvider"
      | "modelId"
      | "thinkingLevel"
      | "builtinTools"
      | "connectedRepos"
      | "purposeGate"
      | "tillDone"
      | "branding"
      | "toolOverrides"
    >
  >
) {
  await updateDoc(agentDoc(userId, agentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAgent(userId: string, agentId: string) {
  await deleteDoc(agentDoc(userId, agentId));
}

export async function listAgents(userId: string) {
  const q = query(agentsCollection(userId), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getAgent(userId: string, agentId: string) {
  const snapshot = await getDoc(agentDoc(userId, agentId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as AgentDoc & { id: string };
}
