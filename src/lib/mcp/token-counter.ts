import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function trackUsage(
  userId: string,
  agentId: string,
  serverId: string,
  inputTokens: number,
  outputTokens: number
) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const usageRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("agents")
    .doc(agentId)
    .collection("mcpServers")
    .doc(serverId)
    .collection("usage")
    .doc(yearMonth);

  await usageRef.set(
    {
      inputTokens: FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
      requestCount: FieldValue.increment(1),
      lastRequestAt: now,
    },
    { merge: true }
  );
}
