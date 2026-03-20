"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import {
  webhooksCollection,
  type WebhookDoc,
  type WebhookLogDoc,
  type WebhookEventType,
} from "@/lib/firebase/firestore";
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhookLogs,
} from "@/actions/webhooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Pencil,
} from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { toast } from "sonner";

const OUTBOUND_EVENTS: WebhookEventType[] = [
  "message_sent",
  "tool_call_completed",
  "session_ended",
  "error",
];

interface WebhookManagerProps {
  agentId: string;
  apiKeyPrefix?: string;
  onBack: () => void;
}

export function WebhookManager({ agentId, apiKeyPrefix, onBack }: WebhookManagerProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const wt = t.connectors.webhooks;
  const userId = user?.uid || "";

  const collRef = useMemo(
    () => (userId ? webhooksCollection(userId, agentId) : null),
    [userId, agentId]
  );
  const { data: webhooks, loading: webhooksLoading } = useCollection<WebhookDoc>(
    collRef,
    "createdAt",
    "desc"
  );

  // Logs
  const [logs, setLogs] = useState<(WebhookLogDoc & { id: string })[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Create/Edit dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"inbound" | "outbound">("inbound");
  const [formTargetUrl, setFormTargetUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<WebhookEventType[]>([]);
  const [creating, setCreating] = useState(false);

  const loadLogs = async () => {
    if (!userId) return;
    setLogsLoading(true);
    try {
      const result = await listWebhookLogs(userId, agentId, 50);
      setLogs(result);
    } catch {
      toast.error(wt.toastLogsError);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!userId || !formName.trim()) return;
    setCreating(true);
    try {
      if (editingId) {
        await updateWebhook(userId, agentId, editingId, {
          name: formName.trim(),
          targetUrl: formType === "outbound" ? formTargetUrl.trim() : null,
          secret: formSecret.trim() || null,
          events: formType === "outbound" ? formEvents : [],
        });
        toast.success(wt.toastSaved ?? wt.toastCreated);
      } else {
        await createWebhook(userId, agentId, {
          name: formName.trim(),
          type: formType,
          targetUrl: formType === "outbound" ? formTargetUrl.trim() : undefined,
          secret: formSecret.trim() || undefined,
          events: formType === "outbound" ? formEvents : [],
        });
        toast.success(wt.toastCreated);
      }
      setCreateOpen(false);
      resetForm();
    } catch {
      toast.error(editingId ? wt.toastUpdateError : wt.toastCreateError);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (wh: WebhookDoc & { id: string }) => {
    setEditingId(wh.id);
    setFormName(wh.name);
    setFormType(wh.type);
    setFormTargetUrl(wh.targetUrl || "");
    setFormSecret(wh.secret || "");
    setFormEvents(wh.events || []);
    setCreateOpen(true);
  };

  const handleDelete = async (webhookId: string) => {
    if (!userId) return;
    try {
      await deleteWebhook(userId, agentId, webhookId);
      toast.success(wt.toastDeleted);
    } catch {
      toast.error(wt.toastDeleteError);
    }
  };

  const handleToggle = async (webhookId: string, enabled: boolean) => {
    if (!userId) return;
    try {
      await updateWebhook(userId, agentId, webhookId, { enabled });
    } catch {
      toast.error(wt.toastUpdateError);
    }
  };

  const toggleEvent = (event: WebhookEventType) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormType("inbound");
    setFormTargetUrl("");
    setFormSecret("");
    setFormEvents([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(wt.toastCopied);
  };

  const formatTimestamp = (ts: unknown) => {
    if (!ts) return "—";
    const date =
      typeof (ts as { toDate?: () => Date }).toDate === "function"
        ? (ts as { toDate: () => Date }).toDate()
        : new Date(ts as string);
    return date.toLocaleString();
  };

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {wt.back}
          </Button>
          <h2 className="text-xl font-semibold">{wt.webhooksTab}</h2>
        </div>

        <Tabs defaultValue="webhooks" onValueChange={(v) => v === "logs" && loadLogs()}>
          <TabsList>
            <TabsTrigger value="webhooks">{wt.webhooksTab}</TabsTrigger>
            <TabsTrigger value="logs">{wt.logsTab}</TabsTrigger>
          </TabsList>

          {/* ─── Webhooks Tab ───────────────────────────────────────── */}
          <TabsContent value="webhooks" className="space-y-4">
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {wt.createWebhook}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? (wt.editWebhook ?? "Edit Webhook") : wt.createWebhook}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{wt.name}</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={wt.namePlaceholder}
                    />
                  </div>

                  <div>
                    <Label>{wt.type}</Label>
                    <Select
                      value={formType}
                      onValueChange={(v) => setFormType(v as "inbound" | "outbound")}
                      disabled={!!editingId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">{wt.inbound}</SelectItem>
                        <SelectItem value="outbound">{wt.outbound}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formType === "outbound" && (
                    <div>
                      <Label>{wt.targetUrl}</Label>
                      <Input
                        value={formTargetUrl}
                        onChange={(e) => setFormTargetUrl(e.target.value)}
                        placeholder={wt.targetUrlPlaceholder}
                      />
                    </div>
                  )}

                  <div>
                    <Label>{wt.secretLabel}</Label>
                    <Input
                      value={formSecret}
                      onChange={(e) => setFormSecret(e.target.value)}
                      placeholder={wt.secretPlaceholder}
                    />
                  </div>

                  {formType === "outbound" && (
                    <div>
                      <Label>{wt.events}</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {OUTBOUND_EVENTS.map((event) => (
                          <label
                            key={event}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formEvents.includes(event)}
                              onChange={() => toggleEvent(event)}
                              className="rounded"
                            />
                            {event}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreate}
                    disabled={creating || !formName.trim()}
                    className="w-full"
                  >
                    {creating ? wt.creating : editingId ? (wt.save ?? "Save") : wt.create}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {webhooksLoading ? (
              <p className="text-muted-foreground text-sm">{wt.loadingWebhooks}</p>
            ) : !webhooks || webhooks.length === 0 ? (
              <p className="text-muted-foreground text-sm">{wt.noWebhooks}</p>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <Card key={wh.id}>
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{wh.name}</span>
                          <Badge variant={wh.type === "inbound" ? "default" : "secondary"}>
                            {wh.type === "inbound" ? wt.inbound : wt.outbound}
                          </Badge>
                          {wh.secret && (
                            <Badge variant="outline" className="text-xs">
                              HMAC
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={wh.enabled}
                            onCheckedChange={(checked) => handleToggle(wh.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(wh)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(wh.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {wh.type === "inbound" && (() => {
                        const isFullKey = apiKeyPrefix && apiKeyPrefix.startsWith("kpn_") && apiKeyPrefix.length > 20;
                        const keyDisplay = isFullKey ? apiKeyPrefix : (apiKeyPrefix ? apiKeyPrefix + "..." : "YOUR_API_KEY");
                        const webhookUrl = `https://kopern.vercel.app/api/webhook/${agentId}?key=${keyDisplay}`;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                                {webhookUrl}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(webhookUrl)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {!isFullKey && apiKeyPrefix && (
                              <p className="text-xs text-muted-foreground">
                                {wt.replaceKey.replace("{key}", apiKeyPrefix + "...")}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {wh.type === "outbound" && wh.targetUrl && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="truncate">{wh.targetUrl}</span>
                        </div>
                      )}

                      {wh.type === "outbound" && wh.events.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {wh.events.map((ev) => (
                            <Badge key={ev} variant="outline" className="text-xs">
                              {ev}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Logs Tab ───────────────────────────────────────────── */}
          <TabsContent value="logs" className="space-y-4">
            {logsLoading ? (
              <p className="text-muted-foreground text-sm">{wt.loadingLogs}</p>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">{wt.noLogs}</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant={log.direction === "inbound" ? "default" : "secondary"}>
                            {log.direction === "inbound" ? wt.inbound : wt.outbound}
                          </Badge>
                          {log.status === "success" ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {wt.success}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              {wt.error}
                            </span>
                          )}
                          {log.statusCode !== null && (
                            <span className="text-muted-foreground">{log.statusCode}</span>
                          )}
                          <span className="text-muted-foreground">{log.durationMs}ms</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SlideUp>
  );
}
