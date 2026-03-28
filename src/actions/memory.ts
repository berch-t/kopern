import {
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { memoryCollection, memoryEntryDoc, type MemoryEntryDoc } from "@/lib/firebase/firestore";

export async function listMemories(
  userId: string,
  agentId: string
): Promise<(MemoryEntryDoc & { id: string })[]> {
  const q = query(memoryCollection(userId, agentId), orderBy("lastAccessedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function addMemory(
  userId: string,
  agentId: string,
  key: string,
  value: string,
  category: MemoryEntryDoc["category"] = "fact"
): Promise<void> {
  const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  const now = serverTimestamp();
  await setDoc(memoryEntryDoc(userId, agentId, docId), {
    key,
    value,
    category,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  } as unknown as MemoryEntryDoc);
}

export async function updateMemory(
  userId: string,
  agentId: string,
  memoryId: string,
  value: string
): Promise<void> {
  await updateDoc(memoryEntryDoc(userId, agentId, memoryId), {
    value,
    updatedAt: serverTimestamp(),
    lastAccessedAt: serverTimestamp(),
  });
}

export async function deleteMemory(
  userId: string,
  agentId: string,
  memoryId: string
): Promise<void> {
  await deleteDoc(memoryEntryDoc(userId, agentId, memoryId));
}
