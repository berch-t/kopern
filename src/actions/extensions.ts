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
  extensionsCollection,
  extensionDoc,
  type ExtensionDoc,
} from "@/lib/firebase/firestore";

export async function createExtension(
  userId: string,
  agentId: string,
  data: { name: string; description: string; code: string; events: string[]; blocking: boolean }
) {
  const ref = await addDoc(extensionsCollection(userId, agentId), {
    ...data,
    enabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as ExtensionDoc);
  return ref.id;
}

export async function updateExtension(
  userId: string,
  agentId: string,
  extensionId: string,
  data: Partial<Pick<ExtensionDoc, "name" | "description" | "code" | "events" | "blocking" | "enabled">>
) {
  await updateDoc(extensionDoc(userId, agentId, extensionId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteExtension(userId: string, agentId: string, extensionId: string) {
  await deleteDoc(extensionDoc(userId, agentId, extensionId));
}

export async function listExtensions(userId: string, agentId: string) {
  const q = query(extensionsCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
