"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { extensionsCollection, type ExtensionDoc } from "@/lib/firebase/firestore";
import { createExtension, updateExtension, deleteExtension } from "@/actions/extensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonacoWrapper } from "@/components/code/MonacoWrapper";
import { Plus, Trash2 } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DEFAULT_EXTENSION = `// Extension module
// Available: pi.registerTool(), pi.on(), pi.addSlashCommand()

export function activate(pi) {
  // Register custom behavior here
}`;

export default function ExtensionsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: extensions, loading } = useCollection<ExtensionDoc>(
    user ? extensionsCollection(user.uid, agentId) : null,
    "createdAt"
  );
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState(DEFAULT_EXTENSION);
  const [selectedExt, setSelectedExt] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");

  async function handleCreate() {
    if (!user || !newName.trim()) return;
    try {
      await createExtension(user.uid, agentId, {
        name: newName,
        description: newDesc,
        code: newCode,
      });
      toast.success("Extension created");
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      setNewCode(DEFAULT_EXTENSION);
    } catch {
      toast.error("Failed to create extension");
    }
  }

  async function handleToggle(ext: ExtensionDoc & { id: string }) {
    if (!user) return;
    try {
      await updateExtension(user.uid, agentId, ext.id, { enabled: !ext.enabled });
    } catch {
      toast.error("Failed to toggle extension");
    }
  }

  async function handleDelete(extId: string) {
    if (!user) return;
    try {
      await deleteExtension(user.uid, agentId, extId);
      toast.success("Extension deleted");
    } catch {
      toast.error("Failed to delete extension");
    }
  }

  async function handleSaveCode(extId: string) {
    if (!user) return;
    try {
      await updateExtension(user.uid, agentId, extId, { code: editCode });
      toast.success("Extension code saved");
      setSelectedExt(null);
    } catch {
      toast.error("Failed to save extension");
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Extensions</h1>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Extension
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>New Extension</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                  </div>
                </div>
                <MonacoWrapper value={newCode} onChange={setNewCode} language="typescript" height="400px" />
                <Button onClick={handleCreate} disabled={!newName.trim()}>
                  Create Extension
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SlideUp>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading extensions...</div>
      ) : extensions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No extensions yet.
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((ext) => (
            <Card key={ext.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{ext.name}</CardTitle>
                  <Badge variant={ext.enabled ? "default" : "secondary"}>
                    {ext.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(ext)}>
                    {ext.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedExt(ext.id);
                      setEditCode(ext.code);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ext.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {selectedExt === ext.id && (
                <CardContent className="space-y-3">
                  <MonacoWrapper value={editCode} onChange={setEditCode} language="typescript" height="300px" />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedExt(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleSaveCode(ext.id)}>Save</Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
