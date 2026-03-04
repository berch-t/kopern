import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { skillsCollection, skillDoc, type SkillDoc } from "@/lib/firebase/firestore";

export async function createSkill(
  userId: string,
  agentId: string,
  data: { name: string; description: string; content: string }
) {
  const ref = await addDoc(skillsCollection(userId, agentId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as SkillDoc);
  return ref.id;
}

export async function updateSkill(
  userId: string,
  agentId: string,
  skillId: string,
  data: Partial<Pick<SkillDoc, "name" | "description" | "content">>
) {
  await updateDoc(skillDoc(userId, agentId, skillId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSkill(userId: string, agentId: string, skillId: string) {
  await deleteDoc(skillDoc(userId, agentId, skillId));
}

export async function listSkills(userId: string, agentId: string) {
  const q = query(skillsCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
