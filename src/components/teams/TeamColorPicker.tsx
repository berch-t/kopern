"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

const TEAM_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#78716c", // stone
  "#64748b", // slate
];

function stop(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

interface TeamColorPickerProps {
  teamId: string;
  currentColor?: string;
  className?: string;
}

export function TeamColorPicker({ teamId, currentColor, className }: TeamColorPickerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  async function setColor(color: string) {
    if (!user) return;
    const teamRef = doc(db, `users/${user.uid}/agentTeams/${teamId}`);
    await updateDoc(teamRef, { color });
    setOpen(false);
  }

  async function clearColor() {
    if (!user) return;
    const teamRef = doc(db, `users/${user.uid}/agentTeams/${teamId}`);
    await updateDoc(teamRef, { color: "" });
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)} onClick={stop}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted transition-colors"
        title="Team color"
      >
        {currentColor ? (
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentColor }} />
        ) : (
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { stop(e); setOpen(false); }}
          />
          {/* Picker */}
          <div className="absolute right-0 top-full z-50 mt-1 w-[152px] rounded-lg border bg-background p-2.5 shadow-lg">
            <div className="grid grid-cols-4 gap-2">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColor(color)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all hover:scale-110",
                    currentColor === color && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {currentColor && (
              <button
                type="button"
                onClick={clearColor}
                className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Remove color
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
