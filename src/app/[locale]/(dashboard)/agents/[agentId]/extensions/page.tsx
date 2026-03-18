"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { extensionsCollection, type ExtensionDoc, type ExtensionEventType } from "@/lib/firebase/firestore";
import { createExtension, updateExtension, deleteExtension } from "@/actions/extensions";
import { EXTENSION_EVENT_CATEGORIES, BLOCKING_EVENTS } from "@/lib/extensions/event-types";
import { useDictionary } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonacoWrapper } from "@/components/code/MonacoWrapper";
import { Plus, Trash2, Shield, ChevronRight, Check } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DEFAULT_EXTENSION = `// Extension code runs when selected events fire.
// Available variables: context.eventType, context.data, log()
// For blocking events: set blocked = true; blockReason = "...";

log("Extension triggered: " + context.eventType);`;

function EventSelector({
  selected,
  onChange,
  categoryLabels,
  eventsLabel,
}: {
  selected: ExtensionEventType[];
  onChange: (events: ExtensionEventType[]) => void;
  categoryLabels: Record<string, string>;
  eventsLabel: string;
}) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  function toggleCat(key: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleEvent(event: ExtensionEventType) {
    if (selected.includes(event)) {
      onChange(selected.filter((e) => e !== event));
    } else {
      onChange([...selected, event]);
    }
  }

  return (
    <div className="space-y-1">
      <Label>{eventsLabel}</Label>
      <div className="rounded-lg border divide-y">
        {Object.entries(EXTENSION_EVENT_CATEGORIES).map(([key, category]) => {
          const isOpen = openCats.has(key);
          const count = category.events.filter((e) => selected.includes(e)).length;
          return (
            <div key={key}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                onClick={() => toggleCat(key)}
              >
                <span className="font-medium">{categoryLabels[key] || category.label}</span>
                <span className="flex items-center gap-2">
                  {count > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 min-w-[1.5rem] justify-center">
                      {count}/{category.events.length}
                    </Badge>
                  )}
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-2 space-y-0.5">
                  {category.events.map((event) => {
                    const isSelected = selected.includes(event);
                    const isBlocking = BLOCKING_EVENTS.includes(event);
                    return (
                      <button
                        key={event}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                        )}
                        onClick={() => toggleEvent(event)}
                      >
                        <div className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="truncate">{event}</span>
                        {isBlocking && <Shield className="ml-auto h-3 w-3 shrink-0 text-amber-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExtensionsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const ext = t.extensions;
  const { data: extensions, loading } = useCollection<ExtensionDoc>(
    user ? extensionsCollection(user.uid, agentId) : null,
    "createdAt"
  );
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState(DEFAULT_EXTENSION);
  const [newEvents, setNewEvents] = useState<ExtensionEventType[]>([]);
  const [newBlocking, setNewBlocking] = useState(false);
  const [selectedExt, setSelectedExt] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editEvents, setEditEvents] = useState<ExtensionEventType[]>([]);
  const [editBlocking, setEditBlocking] = useState(false);

  const categoryLabels = ext.categories as Record<string, string>;

  async function handleCreate() {
    if (!user || !newName.trim() || newEvents.length === 0) return;
    try {
      await createExtension(user.uid, agentId, {
        name: newName,
        description: newDesc,
        code: newCode,
        events: newEvents,
        blocking: newBlocking,
      });
      toast.success(ext.created);
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      setNewCode(DEFAULT_EXTENSION);
      setNewEvents([]);
      setNewBlocking(false);
    } catch {
      toast.error(ext.errorCreate);
    }
  }

  async function handleToggle(e: ExtensionDoc & { id: string }) {
    if (!user) return;
    try {
      await updateExtension(user.uid, agentId, e.id, { enabled: !e.enabled });
    } catch {
      toast.error(ext.errorToggle);
    }
  }

  async function handleDelete(extId: string) {
    if (!user) return;
    try {
      await deleteExtension(user.uid, agentId, extId);
      toast.success(ext.deleted);
    } catch {
      toast.error(ext.errorDelete);
    }
  }

  async function handleSave(extId: string) {
    if (!user) return;
    try {
      await updateExtension(user.uid, agentId, extId, {
        code: editCode,
        events: editEvents,
        blocking: editBlocking,
      });
      toast.success(ext.saved);
      setSelectedExt(null);
    } catch {
      toast.error(ext.errorSave);
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{ext.title}</h1>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {ext.addExtension}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{ext.newExtension}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{ext.name}</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{ext.description}</Label>
                    <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                  </div>
                </div>

                <EventSelector
                  selected={newEvents}
                  onChange={setNewEvents}
                  categoryLabels={categoryLabels}
                  eventsLabel={ext.events}
                />

                <div className="flex items-center gap-3">
                  <Switch checked={newBlocking} onCheckedChange={setNewBlocking} />
                  <Label className="text-sm">
                    {ext.blocking} — {ext.blockingDesc}
                  </Label>
                </div>

                <MonacoWrapper value={newCode} onChange={setNewCode} language="javascript" height="300px" />
                <Button onClick={handleCreate} disabled={!newName.trim() || newEvents.length === 0}>
                  {ext.createExtension}
                </Button>
                {newEvents.length === 0 && (
                  <p className="text-xs text-destructive">{ext.selectEvent}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SlideUp>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">{ext.loading}</div>
      ) : extensions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {ext.noExtensions}
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((e) => (
            <Card key={e.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{e.name}</CardTitle>
                  <Badge variant={e.enabled ? "default" : "secondary"}>
                    {e.enabled ? ext.enabled : ext.disabled}
                  </Badge>
                  {e.blocking && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                      <Shield className="mr-1 h-3 w-3" />
                      {ext.blocking}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(e)}>
                    {e.enabled ? ext.disable : ext.enable}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedExt(e.id);
                      setEditCode(e.code);
                      setEditEvents(e.events || []);
                      setEditBlocking(e.blocking ?? false);
                    }}
                  >
                    {ext.edit}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              {/* Event badges */}
              {e.events && e.events.length > 0 && selectedExt !== e.id && (
                <CardContent className="pt-0 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {e.events.map((event) => (
                      <Badge key={event} variant="secondary" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}

              {selectedExt === e.id && (
                <CardContent className="space-y-4">
                  <EventSelector
                    selected={editEvents}
                    onChange={setEditEvents}
                    categoryLabels={categoryLabels}
                    eventsLabel={ext.events}
                  />

                  <div className="flex items-center gap-3">
                    <Switch checked={editBlocking} onCheckedChange={setEditBlocking} />
                    <Label className="text-sm">{ext.blocking}</Label>
                  </div>

                  <MonacoWrapper value={editCode} onChange={setEditCode} language="javascript" height="300px" />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedExt(null)}>
                      {ext.cancel}
                    </Button>
                    <Button onClick={() => handleSave(e.id)}>{ext.save}</Button>
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
