import type {
  AgentTeamDoc,
  AgentTeamMember,
  FlowNode,
  FlowEdge,
} from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Team → Flow (deserialize from Firestore into React Flow)
// ---------------------------------------------------------------------------

const Y_GAP = 140;
const X_GAP = 260;

export function teamToFlow(
  team: AgentTeamDoc,
  agentNames: Record<string, string>,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  // If flow data already exists, return it directly
  if (team.flowNodes?.length) {
    return { nodes: team.flowNodes, edges: team.flowEdges ?? [] };
  }

  // Auto-generate flow from team members
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const sorted = [...team.agents].sort((a, b) => a.order - b.order);
  const centerX = 300;

  // Trigger node
  const triggerId = "trigger-start";
  nodes.push({
    id: triggerId,
    type: "trigger",
    position: { x: centerX, y: 0 },
    data: { label: "Start", description: team.executionMode },
  });

  if (team.executionMode === "parallel") {
    // Fan-out from trigger to all agents, then fan-in to output
    const totalWidth = (sorted.length - 1) * X_GAP;
    const startX = centerX - totalWidth / 2;

    sorted.forEach((member, i) => {
      const nodeId = `agent-${member.agentId}`;
      nodes.push({
        id: nodeId,
        type: "agent",
        position: { x: startX + i * X_GAP, y: Y_GAP },
        data: {
          agentId: member.agentId,
          label: agentNames[member.agentId] || member.agentId.slice(0, 8),
          role: member.role,
          roleType: member.roleType,
          description: member.description,
        },
      });
      edges.push({
        id: `e-trigger-${nodeId}`,
        source: triggerId,
        target: nodeId,
        animated: true,
      });
    });

    // Output node
    const outputId = "output-result";
    nodes.push({
      id: outputId,
      type: "output",
      position: { x: centerX, y: Y_GAP * 2 },
      data: { label: "Aggregate Results", aggregation: "concat" },
    });

    sorted.forEach((member) => {
      edges.push({
        id: `e-agent-${member.agentId}-output`,
        source: `agent-${member.agentId}`,
        target: outputId,
      });
    });
  } else if (team.executionMode === "sequential") {
    // Chain: trigger → agent1 → agent2 → ... → output
    let prevId = triggerId;
    sorted.forEach((member, i) => {
      const nodeId = `agent-${member.agentId}`;
      nodes.push({
        id: nodeId,
        type: "agent",
        position: { x: centerX, y: (i + 1) * Y_GAP },
        data: {
          agentId: member.agentId,
          label: agentNames[member.agentId] || member.agentId.slice(0, 8),
          role: member.role,
          roleType: member.roleType,
          description: member.description,
        },
      });
      edges.push({
        id: `e-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        animated: true,
      });
      prevId = nodeId;
    });

    const outputId = "output-result";
    nodes.push({
      id: outputId,
      type: "output",
      position: { x: centerX, y: (sorted.length + 1) * Y_GAP },
      data: { label: "Final Output", aggregation: "last" },
    });
    edges.push({
      id: `e-${prevId}-output`,
      source: prevId,
      target: outputId,
    });
  } else {
    // Conditional: trigger → condition → branches
    const condId = "condition-router";
    nodes.push({
      id: condId,
      type: "condition",
      position: { x: centerX, y: Y_GAP },
      data: { label: "Router", condition: "Analyze intent" },
    });
    edges.push({
      id: `e-trigger-cond`,
      source: triggerId,
      target: condId,
      animated: true,
    });

    const totalWidth = (sorted.length - 1) * X_GAP;
    const startX = centerX - totalWidth / 2;

    sorted.forEach((member, i) => {
      const nodeId = `agent-${member.agentId}`;
      nodes.push({
        id: nodeId,
        type: "agent",
        position: { x: startX + i * X_GAP, y: Y_GAP * 2.2 },
        data: {
          agentId: member.agentId,
          label: agentNames[member.agentId] || member.agentId.slice(0, 8),
          role: member.role,
          roleType: member.roleType,
          description: member.description,
        },
      });
      edges.push({
        id: `e-cond-${nodeId}`,
        source: condId,
        target: nodeId,
        sourceHandle: i === 0 ? "true" : i === sorted.length - 1 ? "false" : "default",
        label: member.role,
      });
    });

    const outputId = "output-result";
    nodes.push({
      id: outputId,
      type: "output",
      position: { x: centerX, y: Y_GAP * 3.4 },
      data: { label: "Result", aggregation: "last" },
    });
    sorted.forEach((member) => {
      edges.push({
        id: `e-agent-${member.agentId}-output`,
        source: `agent-${member.agentId}`,
        target: outputId,
      });
    });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Flow → Team (serialize React Flow back to Firestore team format)
// ---------------------------------------------------------------------------

export function flowToTeamMembers(
  nodes: FlowNode[],
  edges: FlowEdge[],
): AgentTeamMember[] {
  const agentNodes = nodes.filter((n) => n.type === "agent" && n.data.agentId);

  // Determine order from topological position (y-coordinate)
  const sorted = [...agentNodes].sort((a, b) => a.position.y - b.position.y);

  return sorted.map((node, i) => ({
    agentId: node.data.agentId!,
    role: node.data.role || "",
    roleType: node.data.roleType,
    order: i,
    description: node.data.description || "",
  }));
}

// ---------------------------------------------------------------------------
// Detect execution mode from flow topology
// ---------------------------------------------------------------------------

export function detectExecutionMode(
  nodes: FlowNode[],
  edges: FlowEdge[],
): "parallel" | "sequential" | "conditional" {
  const hasCondition = nodes.some((n) => n.type === "condition");
  if (hasCondition) return "conditional";

  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return "sequential";

  // Count direct edges from trigger to agent nodes
  const triggerOutEdges = edges.filter((e) => e.source === triggerNode.id);
  const agentTargets = triggerOutEdges.filter((e) =>
    nodes.find((n) => n.id === e.target && n.type === "agent"),
  );

  return agentTargets.length > 1 ? "parallel" : "sequential";
}
