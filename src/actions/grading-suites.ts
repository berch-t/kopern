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
  gradingCasesCollection,
  type GradingSuiteDoc,
  type GradingCaseDoc,
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

export async function duplicateGradingSuite(
  userId: string,
  agentId: string,
  suiteId: string
): Promise<string> {
  // Read source suite
  const suitesSnap = await getDocs(
    query(gradingSuitesCollection(userId, agentId))
  );
  const sourceDoc = suitesSnap.docs.find((d) => d.id === suiteId);
  if (!sourceDoc) throw new Error("Suite not found");
  const suiteData = sourceDoc.data();

  // Create new suite with "(copy)" suffix
  const newSuiteRef = await addDoc(gradingSuitesCollection(userId, agentId), {
    name: `${suiteData.name} (copy)`,
    description: suiteData.description,
    createdAt: serverTimestamp(),
  } as unknown as GradingSuiteDoc);

  // Copy all cases
  const casesSnap = await getDocs(
    query(gradingCasesCollection(userId, agentId, suiteId), orderBy("orderIndex", "asc"))
  );
  const copyPromises = casesSnap.docs.map((caseDoc) => {
    const caseData = caseDoc.data();
    return addDoc(gradingCasesCollection(userId, agentId, newSuiteRef.id), {
      name: caseData.name,
      inputPrompt: caseData.inputPrompt,
      expectedBehavior: caseData.expectedBehavior,
      criteria: caseData.criteria,
      orderIndex: caseData.orderIndex,
      createdAt: serverTimestamp(),
    } as unknown as GradingCaseDoc);
  });
  await Promise.all(copyPromises);

  return newSuiteRef.id;
}

export async function listGradingSuites(userId: string, agentId: string) {
  const q = query(gradingSuitesCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
