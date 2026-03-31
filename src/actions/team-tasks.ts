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
  teamTasksCollection,
  teamTaskDoc,
  type TaskDoc,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/firebase/firestore";

export async function createTask(
  userId: string,
  teamId: string,
  data: {
    title: string;
    description: string;
    priority: TaskPriority;
    assigneeAgentId?: string;
    parentTaskId?: string;
    goalId?: string;
  },
): Promise<string> {
  const ref = await addDoc(teamTasksCollection(userId, teamId), {
    ...data,
    status: "backlog" as TaskStatus,
    teamId,
    createdBy: "human",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as TaskDoc);
  return ref.id;
}

export async function updateTask(
  userId: string,
  teamId: string,
  taskId: string,
  data: Partial<Pick<TaskDoc, "title" | "description" | "status" | "priority" | "assigneeAgentId" | "output">>,
): Promise<void> {
  const update: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.status === "done") update.completedAt = serverTimestamp();
  await updateDoc(teamTaskDoc(userId, teamId, taskId), update);
}

export async function deleteTask(userId: string, teamId: string, taskId: string): Promise<void> {
  await deleteDoc(teamTaskDoc(userId, teamId, taskId));
}

export async function listTasks(
  userId: string,
  teamId: string,
): Promise<(TaskDoc & { id: string })[]> {
  const q = query(teamTasksCollection(userId, teamId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listTasksByStatus(
  userId: string,
  teamId: string,
  status: TaskStatus,
): Promise<(TaskDoc & { id: string })[]> {
  const q = query(teamTasksCollection(userId, teamId), where("status", "==", status));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
