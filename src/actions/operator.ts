import { getDoc, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { usageDoc, sessionsCollection, type SessionDoc, type UsageDoc } from "@/lib/firebase/firestore";

const USD_TO_EUR = 0.92;

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousYearMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export interface OperatorKPIs {
  messagesThisMonth: number;
  messagesLastMonth: number;
  messageTrend: number | null;
  resolutionRate: number | null;
  monthlyCostEUR: number;
  previousCostEUR: number;
  costTrend: number | null;
}

export async function getOperatorKPIs(userId: string, agentId: string): Promise<OperatorKPIs> {
  const currentYM = getCurrentYearMonth();
  const previousYM = getPreviousYearMonth();

  // Fetch current and previous month usage
  const [currentSnap, previousSnap] = await Promise.all([
    getDoc(usageDoc(userId, currentYM)),
    getDoc(usageDoc(userId, previousYM)),
  ]);

  const currentUsage = currentSnap.exists() ? (currentSnap.data() as UsageDoc) : null;
  const previousUsage = previousSnap.exists() ? (previousSnap.data() as UsageDoc) : null;

  const currentAgent = currentUsage?.agentBreakdown?.[agentId];
  const previousAgent = previousUsage?.agentBreakdown?.[agentId];

  const monthlyCostEUR = (currentAgent?.cost ?? 0) * USD_TO_EUR;
  const previousCostEUR = (previousAgent?.cost ?? 0) * USD_TO_EUR;

  // Fetch sessions for current month to compute messages + resolution rate
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfPrevMonth = new Date(startOfMonth);
  startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);

  const sessionsQuery = query(
    sessionsCollection(userId, agentId),
    where("startedAt", ">=", Timestamp.fromDate(startOfMonth)),
    orderBy("startedAt", "desc"),
  );

  const prevSessionsQuery = query(
    sessionsCollection(userId, agentId),
    where("startedAt", ">=", Timestamp.fromDate(startOfPrevMonth)),
    where("startedAt", "<", Timestamp.fromDate(startOfMonth)),
    orderBy("startedAt", "desc"),
  );

  const [sessionsSnap, prevSessionsSnap] = await Promise.all([
    getDocs(sessionsQuery),
    getDocs(prevSessionsQuery),
  ]);

  // Count messages
  let messagesThisMonth = 0;
  let resolvedCount = 0;
  let totalSessions = 0;

  sessionsSnap.forEach((doc) => {
    const session = doc.data() as SessionDoc;
    // Skip internal sessions (grading, autoresearch)
    if (session.source === "grading" || session.source === "autoresearch") return;
    totalSessions++;
    messagesThisMonth += session.messageCount;
    // Resolved = ended normally without error events
    const hasError = session.events?.some((e) => e.type === "error");
    if (session.endedAt && !hasError) resolvedCount++;
  });

  let messagesLastMonth = 0;
  prevSessionsSnap.forEach((doc) => {
    const session = doc.data() as SessionDoc;
    if (session.source === "grading" || session.source === "autoresearch") return;
    messagesLastMonth += session.messageCount;
  });

  const resolutionRate = totalSessions > 0 ? Math.round((resolvedCount / totalSessions) * 100) : null;
  const messageTrend = messagesLastMonth > 0
    ? Math.round(((messagesThisMonth - messagesLastMonth) / messagesLastMonth) * 100)
    : null;
  const costTrend = previousCostEUR > 0.01
    ? Math.round(((monthlyCostEUR - previousCostEUR) / previousCostEUR) * 100)
    : null;

  return {
    messagesThisMonth,
    messagesLastMonth,
    messageTrend,
    resolutionRate,
    monthlyCostEUR,
    previousCostEUR,
    costTrend,
  };
}

export interface ConversationSummary {
  id: string;
  firstMessage: string;
  startedAt: Date;
  messageCount: number;
  source: SessionDoc["source"];
  resolved: boolean;
  toolCallCount: number;
  totalTokens: number;
  costEUR: number;
  durationSec: number | null;
  model: string;
}

export async function getRecentConversations(
  userId: string,
  agentId: string,
  max = 20,
): Promise<ConversationSummary[]> {
  const q = query(
    sessionsCollection(userId, agentId),
    orderBy("startedAt", "desc"),
    limit(max + 10), // fetch extra to skip grading/autoresearch
  );

  const snap = await getDocs(q);
  const conversations: ConversationSummary[] = [];

  snap.forEach((doc) => {
    if (conversations.length >= max) return;
    const session = doc.data() as SessionDoc;
    // Skip internal sessions
    if (session.source === "grading" || session.source === "autoresearch") return;

    // Extract first user message from events
    const firstUserEvent = session.events?.find(
      (e) => e.type === "message" && (e.data as Record<string, unknown>).role === "user",
    );
    const rawMessage = firstUserEvent
      ? String((firstUserEvent.data as Record<string, unknown>).content ?? "")
      : session.purpose ?? "";
    const firstMessage = rawMessage.length > 120 ? rawMessage.slice(0, 120) + "..." : rawMessage;

    const hasError = session.events?.some((e) => e.type === "error");
    const startDate = session.startedAt?.toDate?.() ?? new Date();
    const endDate = session.endedAt?.toDate?.() ?? null;
    const durationSec = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 1000) : null;

    conversations.push({
      id: doc.id,
      firstMessage: firstMessage || "—",
      startedAt: startDate,
      messageCount: session.messageCount,
      source: session.source,
      resolved: Boolean(session.endedAt && !hasError),
      toolCallCount: session.toolCallCount ?? 0,
      totalTokens: (session.totalTokensIn ?? 0) + (session.totalTokensOut ?? 0),
      costEUR: (session.totalCost ?? 0) * 0.92,
      durationSec,
      model: session.modelUsed ?? "",
    });
  });

  return conversations;
}
