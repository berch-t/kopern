"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./nodes/AgentNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { TriggerNode } from "./nodes/TriggerNode";
import { OutputNode } from "./nodes/OutputNode";
import type { FlowNode, FlowEdge, AgentDoc } from "@/lib/firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Bot,
  GitBranch,
  Play,
  Flag,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlowEditorProps {
  initialNodes: FlowNode[];
  initialEdges: FlowEdge[];
  agents: (AgentDoc & { id: string })[];
  onSave: (nodes: FlowNode[], edges: FlowEdge[]) => void | Promise<void>;
  onExecute?: () => void;
  saving?: boolean;
  /** Runtime status per node id */
  nodeStatus?: Record<string, "idle" | "running" | "completed" | "failed">;
}

// ---------------------------------------------------------------------------
// Node type registry
// ---------------------------------------------------------------------------

const nodeTypes = {
  agent: AgentNode,
  condition: ConditionNode,
  trigger: TriggerNode,
  output: OutputNode,
};

// ---------------------------------------------------------------------------
// Drag-to-add palette items
// ---------------------------------------------------------------------------

const PALETTE_ITEMS = [
  { type: "agent" as const, icon: Bot, label: "Agent", color: "text-blue-500" },
  { type: "condition" as const, icon: GitBranch, label: "Condition", color: "text-amber-500" },
  { type: "trigger" as const, icon: Play, label: "Trigger", color: "text-emerald-500" },
  { type: "output" as const, icon: Flag, label: "Output", color: "text-foreground/70" },
];

const DEFAULT_DATA: Record<string, Record<string, unknown>> = {
  agent: { label: "New Agent", role: "specialist", roleType: "specialist" },
  condition: { label: "Condition", condition: "" },
  trigger: { label: "Start", triggerType: "manual" },
  output: { label: "Output", aggregation: "concat" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlowEditor({
  initialNodes,
  initialEdges,
  agents,
  onSave,
  onExecute,
  saving,
  nodeStatus,
}: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Inject runtime status into node data
  const enrichedInitial = useMemo(() => {
    if (!nodeStatus) return initialNodes as Node[];
    return initialNodes.map((n) => ({
      ...n,
      data: { ...n.data, status: nodeStatus[n.id] ?? "idle" },
    })) as Node[];
  }, [initialNodes, nodeStatus]);

  const [nodes, setNodes, onNodesChange] = useNodesState(enrichedInitial);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map((e) => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { strokeWidth: 2 },
    })) as Edge[],
  );

  // Update status when prop changes
  useMemo(() => {
    if (!nodeStatus) return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: nodeStatus[n.id] ?? "idle" },
      })),
    );
  }, [nodeStatus, setNodes]);

  const [isDirty, setIsDirty] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            style: { strokeWidth: 2 },
            animated: true,
          },
          eds,
        ),
      );
      setIsDirty(true);
    },
    [setEdges],
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      if (changes.some((c) => c.type !== "select")) setIsDirty(true);
    },
    [onNodesChange],
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      if (changes.some((c) => c.type !== "select")) setIsDirty(true);
    },
    [onEdgesChange],
  );

  // Drag-to-add from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type");
      if (!type) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 30,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { ...DEFAULT_DATA[type] },
      };

      setNodes((nds) => [...nds, newNode]);
      setIsDirty(true);
    },
    [setNodes],
  );

  // Save handler
  const handleSave = useCallback(async () => {
    const flowNodes: FlowNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.type as FlowNode["type"],
      position: n.position,
      data: n.data as FlowNode["data"],
    }));
    const flowEdges: FlowEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      label: typeof e.label === "string" ? e.label : undefined,
      animated: e.animated,
    }));
    await onSave(flowNodes, flowEdges);
    setIsDirty(false);
  }, [nodes, edges, onSave]);

  return (
    <div ref={reactFlowWrapper} className="h-[600px] w-full rounded-xl border bg-background overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        deleteKeyCode={["Backspace", "Delete"]}
        className="[&_.react-flow__edge-path]:!stroke-foreground/30 [&_.react-flow__edge-path:hover]:!stroke-primary"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/30" />
        <MiniMap
          className="!bg-background !border !border-border !rounded-lg !shadow-sm"
          maskColor="rgba(0,0,0,0.08)"
          nodeStrokeWidth={3}
        />
        <Controls
          showInteractive={false}
          className="!bg-background !border !border-border !rounded-lg !shadow-sm [&>button]:!bg-background [&>button]:!border-border [&>button:hover]:!bg-muted"
        />

        {/* Toolbar panel — node palette */}
        <Panel position="top-left" className="!m-3">
          <div className="flex items-center gap-1 rounded-lg border bg-background/95 backdrop-blur-sm p-1.5 shadow-sm">
            {PALETTE_ITEMS.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/reactflow-type", item.type);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
                title={`Drag to add ${item.label}`}
              >
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </Panel>

        {/* Action buttons */}
        <Panel position="top-right" className="!m-3">
          <div className="flex items-center gap-1.5">
            {onExecute && (
              <Button size="sm" onClick={onExecute} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Execute
              </Button>
            )}
            <Button
              size="sm"
              variant={isDirty ? "default" : "outline"}
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Flow"}
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
