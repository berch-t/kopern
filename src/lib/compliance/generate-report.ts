/**
 * EU AI Act Compliance Report Generator (Art. 11)
 *
 * Generates a structured JSON report summarizing an agent's compliance posture:
 * risk classification, transparency measures, audit trail status, human oversight,
 * and tool approval policy.
 */

import { adminDb } from "@/lib/firebase/admin";

export interface ComplianceReport {
  generatedAt: string;
  agentId: string;
  agentName: string;
  riskLevel: "minimal" | "limited" | "high";
  compliance: {
    article6_riskClassification: {
      status: "compliant" | "warning" | "non_compliant";
      level: string;
      description: string;
    };
    article12_auditTrail: {
      status: "compliant" | "warning" | "non_compliant";
      enabled: boolean;
      sessionCount: number;
      description: string;
    };
    article14_humanOversight: {
      status: "compliant" | "warning" | "non_compliant";
      toolApprovalPolicy: string;
      description: string;
    };
    article52_transparency: {
      status: "compliant" | "warning" | "non_compliant";
      connectors: string[];
      description: string;
    };
  };
  summary: {
    totalChecks: number;
    compliant: number;
    warnings: number;
    nonCompliant: number;
    overallStatus: "compliant" | "warning" | "non_compliant";
  };
}

export async function generateComplianceReport(
  userId: string,
  agentId: string
): Promise<ComplianceReport> {
  // Load agent doc
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) {
    throw new Error("Agent not found");
  }
  const agent = agentSnap.data()!;
  const riskLevel = (agent.riskLevel as "minimal" | "limited" | "high") || "minimal";
  const auditLog = agent.auditLog === true;
  const toolApprovalPolicy = (agent.toolApprovalPolicy as string) || "auto";

  // Count sessions (audit trail evidence)
  const sessionsSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/sessions`)
    .limit(100)
    .get();
  const sessionCount = sessionsSnap.size;

  // Check active connectors
  const connectors: string[] = [];
  const widgetSnap = await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/widget`).get();
  if (widgetSnap.exists && widgetSnap.data()?.enabled) connectors.push("widget");
  const slackSnap = await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/slackConnection`).get();
  if (slackSnap.exists && slackSnap.data()?.enabled !== false) connectors.push("slack");
  const webhooksSnap = await adminDb.collection(`users/${userId}/agents/${agentId}/webhooks`).where("enabled", "==", true).get();
  if (webhooksSnap.size > 0) connectors.push("webhooks");

  // --- Art. 6: Risk Classification ---
  const art6: ComplianceReport["compliance"]["article6_riskClassification"] = {
    status: "compliant",
    level: riskLevel,
    description: `Agent classified as "${riskLevel}" risk.`,
  };

  // --- Art. 12: Audit Trail ---
  const art12Compliant = riskLevel === "minimal" || auditLog;
  const art12: ComplianceReport["compliance"]["article12_auditTrail"] = {
    status: art12Compliant ? "compliant" : "non_compliant",
    enabled: auditLog,
    sessionCount,
    description: auditLog
      ? `Audit trail enabled. ${sessionCount} session(s) recorded.`
      : riskLevel === "minimal"
        ? "Audit trail not required for minimal risk agents."
        : "Audit trail REQUIRED for limited/high risk agents but not enabled.",
  };

  // --- Art. 14: Human Oversight ---
  let art14Status: "compliant" | "warning" | "non_compliant" = "compliant";
  if (riskLevel === "high" && toolApprovalPolicy === "auto") {
    art14Status = "non_compliant";
  } else if (riskLevel === "limited" && toolApprovalPolicy === "auto") {
    art14Status = "warning";
  }
  const art14: ComplianceReport["compliance"]["article14_humanOversight"] = {
    status: art14Status,
    toolApprovalPolicy,
    description:
      art14Status === "compliant"
        ? `Tool approval policy "${toolApprovalPolicy}" meets oversight requirements for ${riskLevel} risk.`
        : art14Status === "warning"
          ? `Limited risk agent with automatic tool execution. Consider enabling approval for destructive actions.`
          : `High-risk agent MUST have tool approval enabled. Current policy: "${toolApprovalPolicy}".`,
  };

  // --- Art. 52: Transparency ---
  // All Kopern connectors include AI-generated disclosure by default
  const art52: ComplianceReport["compliance"]["article52_transparency"] = {
    status: "compliant",
    connectors,
    description: connectors.length > 0
      ? `AI-generated content disclosure active on: ${connectors.join(", ")}. All Kopern connectors include transparency badges by default.`
      : "No external connectors active. Playground includes AI attribution in interface.",
  };

  // --- Summary ---
  const checks = [art6, art12, art14, art52];
  const compliant = checks.filter((c) => c.status === "compliant").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const nonCompliant = checks.filter((c) => c.status === "non_compliant").length;

  return {
    generatedAt: new Date().toISOString(),
    agentId,
    agentName: (agent.name as string) || "Unnamed Agent",
    riskLevel,
    compliance: {
      article6_riskClassification: art6,
      article12_auditTrail: art12,
      article14_humanOversight: art14,
      article52_transparency: art52,
    },
    summary: {
      totalChecks: 4,
      compliant,
      warnings,
      nonCompliant,
      overallStatus: nonCompliant > 0 ? "non_compliant" : warnings > 0 ? "warning" : "compliant",
    },
  };
}
