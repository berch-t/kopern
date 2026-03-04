"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SystemPromptEditor({ value, onChange }: SystemPromptEditorProps) {
  return (
    <div className="space-y-2">
      <Label>System Prompt</Label>
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="You are a helpful AI assistant specialized in..."
            className="min-h-[300px] font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-[300px] rounded-md border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap text-sm">{value || "No system prompt defined"}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
