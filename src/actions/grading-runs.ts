import {
  addDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  gradingRunsCollection,
  gradingRunDoc,
  runResultsCollection,
  type GradingRunDoc,
  type RunResultDoc,
} from "@/lib/firebase/firestore";

export async function createGradingRun(
  userId: string,
  agentId: string,
  suiteId: string,
  data: { agentVersion: number; totalCases: number }
) {
  const ref = await addDoc(gradingRunsCollection(userId, agentId, suiteId), {
    ...data,
    status: "pending",
    score: null,
    passedCases: 0,
    startedAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
  } as unknown as GradingRunDoc);
  return ref.id;
}

export async function updateGradingRun(
  userId: string,
  agentId: string,
  suiteId: string,
  runId: string,
  data: Partial<Pick<GradingRunDoc, "status" | "score" | "passedCases" | "startedAt" | "completedAt">>
) {
  await updateDoc(gradingRunDoc(userId, agentId, suiteId, runId), data);
}

export async function saveRunResult(
  userId: string,
  agentId: string,
  suiteId: string,
  runId: string,
  data: Omit<RunResultDoc, "createdAt">
) {
  await addDoc(runResultsCollection(userId, agentId, suiteId, runId), {
    ...data,
    createdAt: serverTimestamp(),
  } as unknown as RunResultDoc);
}

export async function listGradingRuns(userId: string, agentId: string, suiteId: string) {
  const q = query(
    gradingRunsCollection(userId, agentId, suiteId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listRunResults(
  userId: string,
  agentId: string,
  suiteId: string,
  runId: string
) {
  const snapshot = await getDocs(runResultsCollection(userId, agentId, suiteId, runId));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
