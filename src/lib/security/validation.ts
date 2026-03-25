/**
 * Zod input validation schemas for all API routes.
 */

import { z } from "zod/v4";
import { NextResponse } from "next/server";

// --- Chat ---
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(50_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(100_000),
      })
    )
    .max(100)
    .optional()
    .default([]),
  sessionId: z.string().max(200).optional(),
  userId: z.string().max(200).optional(),
  connectedRepos: z.array(z.string().max(200)).max(10).optional(),
  agentConfig: z.object({
    systemPrompt: z.string().max(100_000),
    modelProvider: z.string().max(50),
    modelId: z.string().max(100),
    skills: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
    purpose: z.string().max(500).nullable().optional(),
    tillDoneEnabled: z.boolean().optional(),
  }),
});

// --- Widget chat ---
export const widgetChatSchema = z.object({
  message: z.string().min(1).max(10_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(50_000),
      })
    )
    .max(50)
    .optional()
    .default([]),
  sessionId: z.string().max(200).optional(),
});

// --- Webhook inbound ---
export const webhookInboundSchema = z.object({
  message: z.string().min(1).max(10_000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().max(200).optional(),
  webhookId: z.string().max(200).optional(),
});

// --- Bug report ---
export const bugReportSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(10).max(5_000),
  pageUrl: z.string().max(500).optional(),
  reporterEmail: z.string().email().max(200).optional(),
});

// --- MCP key create ---
export const mcpKeyCreateSchema = z.object({
  agentId: z.string().min(1).max(100),
  mcpServerId: z.string().min(1).max(100),
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional().default(60),
});

// --- Approve tool ---
export const approveToolSchema = z.object({
  toolCallId: z.string().min(1).max(200),
  decision: z.enum(["approved", "denied"]),
});

// --- Meta-create ---
export const metaCreateSchema = z.object({
  description: z.string().min(10).max(5_000),
  userId: z.string().max(200).optional(),
});

// --- GDPR ---
export const gdprRequestSchema = z.object({
  userId: z.string().min(1).max(200),
});

// --- Pipeline execute ---
export const pipelineExecuteSchema = z.object({
  prompt: z.string().min(1).max(50_000),
  userId: z.string().min(1).max(200),
  pipelineName: z.string().max(200).optional(),
  steps: z.array(z.object({
    agentId: z.string(),
    agentName: z.string(),
    role: z.string(),
    order: z.number(),
    inputMapping: z.enum(["previous_output", "original_input", "custom"]),
    customInputTemplate: z.string().optional(),
    continueOnError: z.boolean(),
    systemPrompt: z.string(),
    modelProvider: z.string(),
    modelId: z.string(),
    skills: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
  })).min(1).max(20),
});

// --- Team execute ---
export const teamExecuteSchema = z.object({
  prompt: z.string().min(1).max(50_000),
  userId: z.string().min(1).max(200),
  team: z.object({
    name: z.string().max(200),
    executionMode: z.enum(["parallel", "sequential", "conditional"]),
    agents: z.array(z.object({
      agentId: z.string(),
      agentName: z.string(),
      role: z.string(),
      order: z.number(),
      systemPrompt: z.string(),
      modelProvider: z.string(),
      modelId: z.string(),
      skills: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
    })).min(1).max(10),
  }),
});

/**
 * Validate a request body against a Zod schema.
 * Returns `{ data }` on success or `{ error: NextResponse }` on failure.
 */
export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { data: T; error?: never } | { error: NextResponse; data?: never } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        {
          error: "Invalid request body",
          details: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}
