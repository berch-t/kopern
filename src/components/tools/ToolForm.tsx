"use client";

import { useState, useEffect } from "react";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { toolDoc, type ToolDoc } from "@/lib/firebase/firestore";
import { createTool, updateTool } from "@/actions/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonacoWrapper } from "@/components/code/MonacoWrapper";
import { toast } from "sonner";

interface ToolFormProps {
  agentId: string;
  toolId?: string;
  isNew?: boolean;
}

const DEFAULT_SCHEMA = `{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "The input value"
    }
  },
  "required": ["input"]
}`;

const DEFAULT_CODE = `// args contains the parameters defined in your schema
// Return a string result
const { input } = args;
return \`Processed: \${input}\`;`;

export function ToolForm({ agentId, toolId, isNew }: ToolFormProps) {
  const { user } = useAuth();
  const router = useLocalizedRouter();

  const { data: existing } = useDocument<ToolDoc>(
    user && toolId ? toolDoc(user.uid, agentId, toolId) : null
  );

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [parametersSchema, setParametersSchema] = useState(DEFAULT_SCHEMA);
  const [executeCode, setExecuteCode] = useState(DEFAULT_CODE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setLabel(existing.label);
      setDescription(existing.description);
      setParametersSchema(existing.parametersSchema);
      setExecuteCode(existing.executeCode);
    }
  }, [existing]);

  async function handleSave() {
    if (!user) return;

    // Validate JSON schema
    try {
      JSON.parse(parametersSchema);
    } catch {
      toast.error("Invalid JSON schema");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await createTool(user.uid, agentId, {
          name,
          label,
          description,
          parametersSchema,
          executeCode,
        });
        toast.success("Tool created");
      } else if (toolId) {
        await updateTool(user.uid, agentId, toolId, {
          name,
          label,
          description,
          parametersSchema,
          executeCode,
        });
        toast.success("Tool updated");
      }
      router.push(`/agents/${agentId}/tools`);
    } catch {
      toast.error("Failed to save tool");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="format_currency"
          />
        </div>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Format Currency"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Formats a number as currency"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Parameters Schema (JSON)</Label>
        <MonacoWrapper
          value={parametersSchema}
          onChange={setParametersSchema}
          language="json"
          height="200px"
        />
      </div>

      <div className="space-y-2">
        <Label>Execute Code (JavaScript)</Label>
        <MonacoWrapper
          value={executeCode}
          onChange={setExecuteCode}
          language="javascript"
          height="300px"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : isNew ? "Create Tool" : "Save Tool"}
        </Button>
      </div>
    </div>
  );
}
