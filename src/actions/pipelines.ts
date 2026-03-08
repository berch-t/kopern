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
  pipelinesCollection,
  pipelineDoc,
  type PipelineDoc,
  type PipelineStep,
} from "@/lib/firebase/firestore";

export async function createPipeline(
  userId: string,
  agentId: string,
  data: {
    name: string;
    description: string;
    steps: PipelineStep[];
  }
) {
  const ref = await addDoc(pipelinesCollection(userId, agentId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as PipelineDoc);
  return ref.id;
}

export async function updatePipeline(
  userId: string,
  agentId: string,
  pipelineId: string,
  data: Partial<Pick<PipelineDoc, "name" | "description" | "steps">>
) {
  await updateDoc(pipelineDoc(userId, agentId, pipelineId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePipeline(userId: string, agentId: string, pipelineId: string) {
  await deleteDoc(pipelineDoc(userId, agentId, pipelineId));
}

export async function listPipelines(userId: string, agentId: string) {
  const q = query(pipelinesCollection(userId, agentId), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPipeline(userId: string, agentId: string, pipelineId: string) {
  const snapshot = await getDoc(pipelineDoc(userId, agentId, pipelineId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as PipelineDoc & { id: string };
}
