import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Atomic task checkout via Firestore transaction.
 * Only one agent can hold a task at a time.
 * Returns true if checkout succeeded, false if already taken.
 */
export async function checkoutTask(
  userId: string,
  teamId: string,
  taskId: string,
  agentId: string,
): Promise<boolean> {
  const taskRef = adminDb.doc(
    `users/${userId}/agentTeams/${teamId}/tasks/${taskId}`,
  );

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(taskRef);
    if (!snap.exists) return false;

    const data = snap.data();
    if (data?.checkedOutBy) return false; // already taken

    tx.update(taskRef, {
      checkedOutBy: agentId,
      checkedOutAt: FieldValue.serverTimestamp(),
      status: "in_progress",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

/**
 * Release a task checkout (agent finished or errored).
 */
export async function releaseTask(
  userId: string,
  teamId: string,
  taskId: string,
  newStatus: "review" | "done" | "blocked",
  output?: string,
): Promise<void> {
  const taskRef = adminDb.doc(
    `users/${userId}/agentTeams/${teamId}/tasks/${taskId}`,
  );

  const update: Record<string, unknown> = {
    checkedOutBy: FieldValue.delete(),
    checkedOutAt: FieldValue.delete(),
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (output) update.output = output;
  if (newStatus === "done") update.completedAt = FieldValue.serverTimestamp();

  await taskRef.update(update);
}
