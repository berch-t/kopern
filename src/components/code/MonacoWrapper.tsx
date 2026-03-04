"use client";

import dynamic from "next/dynamic";
import { type ComponentProps } from "react";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-md border bg-muted">
      <p className="text-sm text-muted-foreground">Loading editor...</p>
    </div>
  ),
});

type EditorProps = ComponentProps<typeof Editor>;

interface MonacoWrapperProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
}

export function MonacoWrapper({
  value,
  onChange,
  language = "typescript",
  height = "400px",
  readOnly = false,
}: MonacoWrapperProps) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange?.(val ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          readOnly,
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
