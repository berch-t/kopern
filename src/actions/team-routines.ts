import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  teamRoutinesCollection,
  teamRoutineDoc,
  type RoutineDoc,
  type ConcurrencyPolicy,
} from "@/lib/firebase/firestore";

export async function createRoutine(
  userId: string,
  teamId: string,
  data: {
    name: string;
    description: string;
    cron: string;
    agentId: string;
    prompt: string;
    concurrencyPolicy?: ConcurrencyPolicy;
    maxRetries?: number;
  },
): Promise<string> {
  const ref = await addDoc(teamRoutinesCollection(userId, teamId), {
    ...data,
    teamId,
    concurrencyPolicy: data.concurrencyPolicy ?? "skip_if_active",
    enabled: true,
    maxRetries: data.maxRetries ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as RoutineDoc);
  return ref.id;
}

export async function updateRoutine(
  userId: string,
  teamId: string,
  routineId: string,
  data: Partial<Pick<RoutineDoc, "name" | "description" | "cron" | "agentId" | "prompt" | "concurrencyPolicy" | "enabled" | "maxRetries">>,
): Promise<void> {
  await updateDoc(teamRoutineDoc(userId, teamId, routineId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRoutine(userId: string, teamId: string, routineId: string): Promise<void> {
  await deleteDoc(teamRoutineDoc(userId, teamId, routineId));
}

export async function listRoutines(
  userId: string,
  teamId: string,
): Promise<(RoutineDoc & { id: string })[]> {
  const q = query(teamRoutinesCollection(userId, teamId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
