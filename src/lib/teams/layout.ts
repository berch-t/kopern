import type { AgentTeamMember } from "@/lib/firebase/firestore";

/**
 * Simplified Buchheim-Walker tree layout algorithm.
 * Computes (x, y) positions for each node in a top-down tree.
 */

export interface LayoutNode {
  id: string;
  label: string;
  role: string;
  x: number;
  y: number;
  children: string[];
}

export interface LayoutEdge {
  from: string;
  to: string;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;
const H_GAP = 40;
const V_GAP = 80;

export function computeOrgLayout(
  members: AgentTeamMember[],
  agentNames: Record<string, string>,
): { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number } {
  // Build adjacency from reportsTo
  const childrenMap = new Map<string, string[]>();
  const roots: string[] = [];

  for (const m of members) {
    if (m.reportsTo) {
      const siblings = childrenMap.get(m.reportsTo) ?? [];
      siblings.push(m.agentId);
      childrenMap.set(m.reportsTo, siblings);
    } else {
      roots.push(m.agentId);
    }
  }

  // If no hierarchy, treat all as flat row under a virtual root
  if (roots.length === members.length) {
    // All top-level — lay out in a single row
    const nodes: LayoutNode[] = members.map((m, i) => ({
      id: m.agentId,
      label: agentNames[m.agentId] || m.agentId.slice(0, 8),
      role: m.role,
      x: i * (NODE_WIDTH + H_GAP),
      y: 0,
      children: [],
    }));
    return {
      nodes,
      edges: [],
      width: members.length * (NODE_WIDTH + H_GAP) - H_GAP,
      height: NODE_HEIGHT,
    };
  }

  // Recursive layout
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let nextX = 0;

  function layoutNode(agentId: string, depth: number): { x: number; width: number } {
    const children = childrenMap.get(agentId) ?? [];
    const member = members.find((m) => m.agentId === agentId);

    if (children.length === 0) {
      const x = nextX;
      nextX += NODE_WIDTH + H_GAP;
      nodes.push({
        id: agentId,
        label: agentNames[agentId] || agentId.slice(0, 8),
        role: member?.role ?? "",
        x,
        y: depth * (NODE_HEIGHT + V_GAP),
        children: [],
      });
      return { x, width: NODE_WIDTH };
    }

    // Layout children first
    const childResults = children.map((childId) => {
      edges.push({ from: agentId, to: childId });
      return { id: childId, ...layoutNode(childId, depth + 1) };
    });

    // Center parent above children
    const firstChild = childResults[0];
    const lastChild = childResults[childResults.length - 1];
    const centerX = (firstChild.x + lastChild.x + NODE_WIDTH) / 2 - NODE_WIDTH / 2;

    nodes.push({
      id: agentId,
      label: agentNames[agentId] || agentId.slice(0, 8),
      role: member?.role ?? "",
      x: centerX,
      y: depth * (NODE_HEIGHT + V_GAP),
      children: children,
    });

    return { x: centerX, width: lastChild.x + NODE_WIDTH - firstChild.x };
  }

  for (const rootId of roots) {
    layoutNode(rootId, 0);
  }

  const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH));
  const maxY = Math.max(...nodes.map((n) => n.y + NODE_HEIGHT));

  return { nodes, edges, width: maxX, height: maxY };
}
