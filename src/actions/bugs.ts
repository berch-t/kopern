import {
  getDocs,
  query,
  orderBy,
  limit,
  where,
  updateDoc,
  type QueryConstraint,
} from "firebase/firestore";
import {
  bugsCollection,
  bugDoc,
  type BugDoc,
  type BugStatus,
} from "@/lib/firebase/firestore";

export type BugWithId = BugDoc & { id: string };

export async function listBugs(
  userId: string,
  opts?: { status?: BugStatus; maxResults?: number }
) {
  const constraints: QueryConstraint[] = [];
  if (opts?.status) {
    constraints.push(where("status", "==", opts.status));
  }
  constraints.push(orderBy("createdAt", "desc"), limit(opts?.maxResults ?? 100));
  const q = query(bugsCollection(userId), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BugWithId[];
}

export async function updateBug(
  userId: string,
  bugId: string,
  data: Partial<Pick<BugDoc, "status" | "analysis" | "notes">>
) {
  const ref = bugDoc(userId, bugId);
  await updateDoc(ref, { ...data, updatedAt: new Date() });
}
