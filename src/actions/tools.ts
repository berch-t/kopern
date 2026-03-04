import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { toolsCollection, toolDoc, type ToolDoc } from "@/lib/firebase/firestore";

export async function createTool(
  userId: string,
  agentId: string,
  data: {
    name: string;
    label: string;
    description: string;
    parametersSchema: string;
    executeCode: string;
  }
) {
  const ref = await addDoc(toolsCollection(userId, agentId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as ToolDoc);
  return ref.id;
}

export async function updateTool(
  userId: string,
  agentId: string,
  toolId: string,
  data: Partial<Pick<ToolDoc, "name" | "label" | "description" | "parametersSchema" | "executeCode">>
) {
  await updateDoc(toolDoc(userId, agentId, toolId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTool(userId: string, agentId: string, toolId: string) {
  await deleteDoc(toolDoc(userId, agentId, toolId));
}

export async function listTools(userId: string, agentId: string) {
  const q = query(toolsCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
