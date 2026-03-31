import {
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import {
  teamActivityCollection,
  type TeamActivityDoc,
  type TeamActivityAction,
} from "@/lib/firebase/firestore";

export async function logTeamActivity(
  userId: string,
  teamId: string,
  action: TeamActivityAction,
  details: Record<string, unknown> = {},
) {
  await addDoc(teamActivityCollection(userId, teamId), {
    action,
    actorId: userId,
    details,
    timestamp: serverTimestamp(),
  } as unknown as TeamActivityDoc);
}

export async function listTeamActivity(
  userId: string,
  teamId: string,
  max = 50,
): Promise<(TeamActivityDoc & { id: string })[]> {
  const q = query(
    teamActivityCollection(userId, teamId),
    orderBy("timestamp", "desc"),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
