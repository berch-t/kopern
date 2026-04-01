"use client";

import { use, useState } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { mcpServersCollection, type McpServerDoc } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { McpServerCard } from "@/components/mcp/McpServerCard";
import { ApiKeyDisplay } from "@/components/mcp/ApiKeyDisplay";
import { Plus, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function McpServersPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: servers, loading } = useCollection<McpServerDoc>(
    user ? mcpServersCollection(user.uid, agentId) : null,
    "createdAt"
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          name: name.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setNewKey(data.apiKey);
        setDialogOpen(false);
        setName("");
        setDescription("");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LocalizedLink href={`/agents/${agentId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </LocalizedLink>
            <div>
              <h1 className="text-3xl font-bold">MCP Servers</h1>
              <p className="text-muted-foreground">
                Expose this agent as an API endpoint
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Server
          </Button>
        </div>
      </SlideUp>

      {loading ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-lg font-medium">No MCP servers</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a server to get an API endpoint for this agent
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Server
            </Button>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {servers.map((server) => (
            <motion.div key={server.id} variants={staggerItem}>
              <McpServerCard server={server} agentId={agentId} />
            </motion.div>
          ))}
        </StaggerChildren>
      )}

      {/* Create Server Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New MCP Server</DialogTitle>
            <DialogDescription>
              Give your server a name and description to identify it easily.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-name">Name</Label>
              <Input
                id="server-name"
                placeholder="e.g. Production, Staging, My App"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-description">Description</Label>
              <Textarea
                id="server-description"
                placeholder="What will this endpoint be used for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? "Creating..." : "Create Server"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {newKey && (
        <ApiKeyDisplay
          apiKey={newKey}
          open={!!newKey}
          onClose={() => setNewKey(null)}
        />
      )}
    </div>
  );
}
