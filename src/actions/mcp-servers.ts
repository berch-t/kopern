import {
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  mcpServersCollection,
  mcpServerDoc,
  mcpUsageCollection,
  type McpServerDoc,
  type McpUsageDoc,
} from "@/lib/firebase/firestore";

export async function updateMcpServer(
  userId: string,
  agentId: string,
  serverId: string,
  data: Partial<Pick<McpServerDoc, "name" | "rateLimitPerMinute">>
) {
  await updateDoc(mcpServerDoc(userId, agentId, serverId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleMcpServer(
  userId: string,
  agentId: string,
  serverId: string,
  enabled: boolean
) {
  await updateDoc(mcpServerDoc(userId, agentId, serverId), {
    enabled,
    updatedAt: serverTimestamp(),
  });
}

export async function listMcpServers(userId: string, agentId: string) {
  const q = query(mcpServersCollection(userId, agentId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getMcpServer(userId: string, agentId: string, serverId: string) {
  const snapshot = await getDoc(mcpServerDoc(userId, agentId, serverId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as McpServerDoc & { id: string };
}

export async function getMcpUsage(userId: string, agentId: string, serverId: string) {
  const snapshot = await getDocs(mcpUsageCollection(userId, agentId, serverId));
  return snapshot.docs.map((doc) => ({
    yearMonth: doc.id,
    ...doc.data(),
  })) as (McpUsageDoc & { yearMonth: string })[];
}
