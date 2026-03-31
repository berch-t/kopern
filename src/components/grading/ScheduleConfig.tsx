"use client";

import { useState } from "react";
import type { GradingScheduleConfig, GradingAlertConfig } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Bell, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleConfigProps {
  schedule?: GradingScheduleConfig;
  alertConfig?: GradingAlertConfig;
  onSave: (schedule: GradingScheduleConfig, alertConfig: GradingAlertConfig) => Promise<void>;
}

const PRESETS = [
  { label: "Every day at 2am", value: "0 2 * * *" },
  { label: "Every day at 8am", value: "0 8 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every hour", value: "0 * * * *" },
];

const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "UTC",
];

export function ScheduleConfig({ schedule, alertConfig, onSave }: ScheduleConfigProps) {
  const [enabled, setEnabled] = useState(schedule?.enabled ?? false);
  const [cron, setCron] = useState(schedule?.cronExpression ?? "0 2 * * *");
  const [tz, setTz] = useState(schedule?.timezone ?? "Europe/Paris");

  const [alertEnabled, setAlertEnabled] = useState(alertConfig?.enabled ?? false);
  const [onScoreDrop, setOnScoreDrop] = useState(alertConfig?.onScoreDrop ?? true);
  const [threshold, setThreshold] = useState(
    alertConfig?.scoreThreshold !== undefined ? String(Math.round(alertConfig.scoreThreshold * 100)) : "70",
  );
  const [email, setEmail] = useState(alertConfig?.channels?.email ?? "");
  const [slackWebhook, setSlackWebhook] = useState(alertConfig?.channels?.slackWebhook ?? "");
  const [webhookUrl, setWebhookUrl] = useState(alertConfig?.channels?.webhookUrl ?? "");

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(
        {
          enabled,
          cronExpression: cron,
          timezone: tz,
        },
        {
          enabled: alertEnabled,
          onScoreDrop,
          scoreThreshold: parseInt(threshold, 10) / 100,
          channels: {
            email: email.trim() || undefined,
            slackWebhook: slackWebhook.trim() || undefined,
            webhookUrl: webhookUrl.trim() || undefined,
          },
        },
      );
      toast.success("Schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Schedule Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Scheduled Runs</CardTitle>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        {enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Schedule (cron expression)</Label>
              <div className="flex gap-2">
                <Input
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 2 * * *"
                  className="font-mono text-sm flex-1"
                />
                <Select value={cron} onValueChange={setCron}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Presets" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Format: minute hour day month weekday (e.g. &quot;0 2 * * *&quot; = daily at 2:00 AM)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Alert Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Alerts</CardTitle>
            </div>
            <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
          </div>
        </CardHeader>
        {alertEnabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Alert on score drop</Label>
              <Switch checked={onScoreDrop} onCheckedChange={setOnScoreDrop} />
            </div>

            <div className="space-y-1.5">
              <Label>Minimum score threshold (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="70"
                className="w-24"
              />
              <p className="text-[11px] text-muted-foreground">Alert if score falls below this percentage</p>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notification channels</p>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slack Incoming Webhook</Label>
                <Input
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custom Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/api/alerts"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Schedule & Alerts
      </Button>
    </div>
  );
}
