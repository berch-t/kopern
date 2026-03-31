import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import {
  goalsCollection,
  goalDoc,
  type GoalDoc,
  type GoalStatus,
} from "@/lib/firebase/firestore";

export async function createGoal(
  userId: string,
  data: {
    title: string;
    description: string;
    teamId?: string;
    agentId?: string;
    parentGoalId?: string;
    dueDate?: Date;
  },
): Promise<string> {
  const ref = await addDoc(goalsCollection(userId), {
    ...data,
    status: "not_started" as GoalStatus,
    progress: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as GoalDoc);
  return ref.id;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: Partial<Pick<GoalDoc, "title" | "description" | "status" | "progress" | "kpis">>,
): Promise<void> {
  await updateDoc(goalDoc(userId, goalId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  await deleteDoc(goalDoc(userId, goalId));
}

export async function listGoals(userId: string): Promise<(GoalDoc & { id: string })[]> {
  const q = query(goalsCollection(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listTeamGoals(
  userId: string,
  teamId: string,
): Promise<(GoalDoc & { id: string })[]> {
  const q = query(goalsCollection(userId), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
