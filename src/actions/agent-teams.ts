import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  agentTeamsCollection,
  agentTeamDoc,
  type AgentTeamDoc,
  type AgentTeamMember,
} from "@/lib/firebase/firestore";

export async function createAgentTeam(
  userId: string,
  data: {
    name: string;
    description: string;
    agents: AgentTeamMember[];
    executionMode: AgentTeamDoc["executionMode"];
  }
) {
  const ref = await addDoc(agentTeamsCollection(userId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as AgentTeamDoc);
  return ref.id;
}

export async function updateAgentTeam(
  userId: string,
  teamId: string,
  data: Partial<Pick<AgentTeamDoc, "name" | "description" | "agents" | "executionMode">>
) {
  await updateDoc(agentTeamDoc(userId, teamId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAgentTeam(userId: string, teamId: string) {
  await deleteDoc(agentTeamDoc(userId, teamId));
}

export async function listAgentTeams(userId: string) {
  const q = query(agentTeamsCollection(userId), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAgentTeam(userId: string, teamId: string) {
  const snapshot = await getDoc(agentTeamDoc(userId, teamId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as AgentTeamDoc & { id: string };
}
