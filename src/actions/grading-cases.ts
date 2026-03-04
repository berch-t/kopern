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
  gradingCasesCollection,
  gradingCaseDoc,
  type GradingCaseDoc,
  type CriterionConfig,
} from "@/lib/firebase/firestore";

export async function createGradingCase(
  userId: string,
  agentId: string,
  suiteId: string,
  data: {
    name: string;
    inputPrompt: string;
    expectedBehavior: string;
    orderIndex: number;
    criteria: CriterionConfig[];
  }
) {
  const ref = await addDoc(gradingCasesCollection(userId, agentId, suiteId), {
    ...data,
    createdAt: serverTimestamp(),
  } as unknown as GradingCaseDoc);
  return ref.id;
}

export async function updateGradingCase(
  userId: string,
  agentId: string,
  suiteId: string,
  caseId: string,
  data: Partial<Pick<GradingCaseDoc, "name" | "inputPrompt" | "expectedBehavior" | "criteria" | "orderIndex">>
) {
  await updateDoc(gradingCaseDoc(userId, agentId, suiteId, caseId), data);
}

export async function deleteGradingCase(
  userId: string,
  agentId: string,
  suiteId: string,
  caseId: string
) {
  await deleteDoc(gradingCaseDoc(userId, agentId, suiteId, caseId));
}

export async function listGradingCases(userId: string, agentId: string, suiteId: string) {
  const q = query(
    gradingCasesCollection(userId, agentId, suiteId),
    orderBy("orderIndex", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
