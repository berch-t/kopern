import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  increment,
  query,
  orderBy,
  type CollectionReference,
} from "firebase/firestore";
import {
  agentsCollection,
  agentDoc,
  skillsCollection,
  toolsCollection,
  extensionsCollection,
  versionsCollection,
  gradingSuitesCollection,
  mcpServersCollection,
  pipelinesCollection,
  sessionsCollection,
  autoresearchRunsCollection,
  webhooksCollection,
  webhookLogsCollection,
  memoryCollection,
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
      | "toolApprovalPolicy"
      | "riskLevel"
      | "auditLog"
      | "templateId"
      | "templateVariables"
      | "memoryConfig"
      | "maxToolIterations"
      | "maxToolResultChars"
    >
  >
) {
  await updateDoc(agentDoc(userId, agentId), {
    ...data,
    updatedAt: serverTimestamp(),
    ...(data.systemPrompt !== undefined ? { version: increment(1) } : {}),
  });
}

/** Delete all docs in a collection (Firestore doesn't cascade deletes to subcollections) */
async function deleteCollection(ref: CollectionReference) {
  const snapshot = await getDocs(ref);
  await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
}

export async function deleteAgent(userId: string, agentId: string) {
  // Delete all subcollections first (Firestore does NOT cascade)
  await Promise.all([
    deleteCollection(skillsCollection(userId, agentId)),
    deleteCollection(toolsCollection(userId, agentId)),
    deleteCollection(extensionsCollection(userId, agentId)),
    deleteCollection(versionsCollection(userId, agentId)),
    deleteCollection(mcpServersCollection(userId, agentId)),
    deleteCollection(pipelinesCollection(userId, agentId)),
    deleteCollection(sessionsCollection(userId, agentId)),
    deleteCollection(autoresearchRunsCollection(userId, agentId)),
    deleteCollection(webhooksCollection(userId, agentId)),
    deleteCollection(webhookLogsCollection(userId, agentId)),
    deleteCollection(memoryCollection(userId, agentId)),
  ]);
  // Delete grading suites + their nested cases/runs
  const suites = await getDocs(gradingSuitesCollection(userId, agentId));
  for (const suite of suites.docs) {
    const casesRef = gradingSuitesCollection(userId, agentId).parent?.parent;
    // Cases and runs are nested under each suite — delete via path
    const { gradingCasesCollection, gradingRunsCollection } = await import("@/lib/firebase/firestore");
    await Promise.all([
      deleteCollection(gradingCasesCollection(userId, agentId, suite.id)),
      deleteCollection(gradingRunsCollection(userId, agentId, suite.id)),
    ]);
    await deleteDoc(suite.ref);
  }
  // Finally delete the agent document itself
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
