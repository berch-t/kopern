import {
  addDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import {
  teamRunsCollection,
  teamRunDoc,
  type TeamRunDoc,
  type TeamRunMemberResult,
} from "@/lib/firebase/firestore";

export async function createTeamRun(
  userId: string,
  teamId: string,
  data: {
    prompt: string;
    executionMode: TeamRunDoc["executionMode"];
  },
): Promise<string> {
  const ref = await addDoc(teamRunsCollection(userId, teamId), {
    ...data,
    status: "running",
    results: [],
    totalCost: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  } as unknown as TeamRunDoc);
  return ref.id;
}

export async function completeTeamRun(
  userId: string,
  teamId: string,
  runId: string,
  data: {
    status: "completed" | "failed";
    results: TeamRunMemberResult[];
    totalCost: number;
    totalTokensIn: number;
    totalTokensOut: number;
  },
): Promise<void> {
  await updateDoc(teamRunDoc(userId, teamId, runId), {
    ...data,
    completedAt: serverTimestamp(),
  });
}

export async function listTeamRuns(
  userId: string,
  teamId: string,
  max = 20,
): Promise<(TeamRunDoc & { id: string })[]> {
  const q = query(
    teamRunsCollection(userId, teamId),
    orderBy("createdAt", "desc"),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
