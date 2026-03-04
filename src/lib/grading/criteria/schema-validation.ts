import Ajv from "ajv";
import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";

interface SchemaValidationConfig {
  jsonSchema: Record<string, unknown>;
}

const ajv = new Ajv({ allErrors: true });

export const schemaValidationEvaluator: CriterionEvaluator = {
  type: "schema_validation",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as SchemaValidationConfig;
    const output = events.assistantOutput;

    // Try to extract JSON from the output
    let parsed: unknown;
    try {
      // Try direct parse first
      parsed = JSON.parse(output);
    } catch {
      // Try to find JSON block in output
      const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          return {
            criterionId: "",
            criterionType: "schema_validation",
            passed: false,
            score: 0,
            message: "Could not extract valid JSON from output",
          };
        }
      } else {
        return {
          criterionId: "",
          criterionType: "schema_validation",
          passed: false,
          score: 0,
          message: "Output does not contain JSON",
        };
      }
    }

    const validate = ajv.compile(c.jsonSchema);
    const valid = validate(parsed);

    if (valid) {
      return {
        criterionId: "",
        criterionType: "schema_validation",
        passed: true,
        score: 1,
        message: "Output matches JSON schema",
      };
    }

    const errors = validate.errors
      ?.map((e) => `${e.instancePath || "root"}: ${e.message}`)
      .join("; ");

    return {
      criterionId: "",
      criterionType: "schema_validation",
      passed: false,
      score: 0,
      message: `Schema validation failed: ${errors}`,
    };
  },
};
