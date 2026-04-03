"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Wrench, AlertCircle, Download } from "lucide-react";
import { type ToolCallInfo } from "@/hooks/useAgent";
import { cn } from "@/lib/utils";

interface ToolCallDisplayProps {
  toolCall: ToolCallInfo;
}

const IMAGE_URL_REGEX = /\[IMAGE_URL\](https?:\/\/[^\s[\]]+)\[\/IMAGE_URL\]/g;

function extractImageUrls(result: string): { text: string; urls: string[] } {
  const urls: string[] = [];
  const text = result.replace(IMAGE_URL_REGEX, (_match, url: string) => {
    urls.push(url.trim());
    return "";
  });
  return { text: text.trim(), urls };
}

function DownloadButton({ url, index }: { url: string; index: number }) {
  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "png";
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `kopern-image-${index + 1}.${ext}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, [url, index]);

  return (
    <button
      onClick={handleDownload}
      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <Download className="h-3 w-3" />
      Download
    </button>
  );
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const hasResult = toolCall.result !== undefined;
  const { text: resultText, urls: imageUrls } = hasResult
    ? extractImageUrls(toolCall.result!)
    : { text: "", urls: [] };
  const hasImages = imageUrls.length > 0;

  return (
    <div
      className={cn(
        "rounded-md border text-xs",
        toolCall.isError ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/50"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {toolCall.isError ? (
          <AlertCircle className="h-3 w-3 text-destructive" />
        ) : (
          <Wrench className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="font-mono font-medium">{toolCall.name}</span>
        {hasResult && (
          <span className="ml-auto text-muted-foreground">
            {toolCall.isError ? "Error" : hasImages ? "Image" : "Done"}
          </span>
        )}
      </button>

      {/* Auto-show image preview without expanding */}
      {hasImages && !expanded && (
        <div className="px-3 pb-2 space-y-2">
          {imageUrls.map((url, i) => (
            <div key={i}>
              <img
                src={url}
                alt="Generated image"
                className="rounded-md max-w-full max-h-80 border border-border"
              />
              <DownloadButton url={url} index={i} />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
          >
            <div className="space-y-2 p-3">
              <div>
                <span className="font-semibold text-muted-foreground">Args:</span>
                <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
              {hasResult && (
                <div>
                  <span className="font-semibold text-muted-foreground">Result:</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono whitespace-pre-wrap">
                    {resultText}
                  </pre>
                </div>
              )}
              {hasImages && (
                <div className="space-y-2">
                  {imageUrls.map((url, i) => (
                    <div key={i}>
                      <img
                        src={url}
                        alt="Generated image"
                        className="rounded-md max-w-full border border-border"
                      />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
