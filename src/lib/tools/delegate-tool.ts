import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TaskDoc } from "@/lib/firebase/firestore";

/**
 * Built-in tool: delegate_task
 * Allows coordinator agents to create and assign tasks to team members.
 */

export const DELEGATE_TASK_DEFINITION = {
  name: "delegate_task",
  description: "Create a task and assign it to a team member. Use this to delegate work to specialist agents.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Detailed description of what needs to be done" },
      assignToAgentId: { type: "string", description: "Agent ID to assign the task to" },
      priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Task priority" },
    },
    required: ["title", "description", "priority"],
  },
};

export async function executeDelegateTool(
  args: Record<string, unknown>,
  userId: string,
  teamId: string,
  creatorAgentId: string,
): Promise<{ result: string; isError: boolean }> {
  const { title, description, assignToAgentId, priority } = args as {
    title?: string;
    description?: string;
    assignToAgentId?: string;
    priority?: string;
  };

  if (!title || !description) {
    return { result: "Both 'title' and 'description' are required.", isError: true };
  }

  const validPriorities = ["critical", "high", "medium", "low"];
  const taskPriority = validPriorities.includes(priority ?? "") ? priority : "medium";

  const taskData: Record<string, unknown> = {
    title,
    description,
    status: assignToAgentId ? "ready" : "backlog",
    priority: taskPriority,
    teamId,
    createdBy: "agent",
    creatorAgentId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (assignToAgentId) {
    taskData.assigneeAgentId = assignToAgentId;
  }

  const taskRef = await adminDb
    .collection(`users/${userId}/agentTeams/${teamId}/tasks`)
    .add(taskData);

  const assignMsg = assignToAgentId
    ? ` and assigned to agent ${assignToAgentId}`
    : " (unassigned)";

  return {
    result: `Task "${title}" created (ID: ${taskRef.id})${assignMsg} with priority ${taskPriority}.`,
    isError: false,
  };
}
