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
  gradingSuitesCollection,
  gradingSuiteDoc,
  type GradingSuiteDoc,
} from "@/lib/firebase/firestore";

export async function createGradingSuite(
  userId: string,
  agentId: string,
  data: { name: string; description: string }
) {
  const ref = await addDoc(gradingSuitesCollection(userId, agentId), {
    ...data,
    createdAt: serverTimestamp(),
  } as unknown as GradingSuiteDoc);
  return ref.id;
}

export async function updateGradingSuite(
  userId: string,
  agentId: string,
  suiteId: string,
  data: Partial<Pick<GradingSuiteDoc, "name" | "description">>
) {
  await updateDoc(gradingSuiteDoc(userId, agentId, suiteId), data);
}

export async function deleteGradingSuite(
  userId: string,
  agentId: string,
  suiteId: string
) {
  await deleteDoc(gradingSuiteDoc(userId, agentId, suiteId));
}

export async function listGradingSuites(userId: string, agentId: string) {
  const q = query(gradingSuitesCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
