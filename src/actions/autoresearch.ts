// Client-side AutoResearch actions (Firestore client SDK)

import {
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  autoresearchRunsCollection,
  autoresearchIterationsCollection,
  type AutoResearchRunDoc,
  type AutoResearchIterationDoc,
} from "@/lib/firebase/firestore";

export async function getAutoresearchRuns(
  userId: string,
  agentId: string
): Promise<(AutoResearchRunDoc & { id: string })[]> {
  const ref = autoresearchRunsCollection(userId, agentId);
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function getAutoresearchIterations(
  userId: string,
  agentId: string,
  runId: string
): Promise<(AutoResearchIterationDoc & { id: string })[]> {
  const ref = autoresearchIterationsCollection(userId, agentId, runId);
  const snap = await getDocs(query(ref, orderBy("index")));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function deleteAutoresearchRun(
  userId: string,
  agentId: string,
  runId: string
): Promise<void> {
  const ref = doc(db, "users", userId, "agents", agentId, "autoresearchRuns", runId);
  await deleteDoc(ref);
}
