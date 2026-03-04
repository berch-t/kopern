"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { userDoc, type UserDoc } from "@/lib/firebase/firestore";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { providers } from "@/lib/pi-mono/providers";
import { SlideUp } from "@/components/motion/SlideUp";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: userData } = useDocument<UserDoc>(
    user ? userDoc(user.uid) : null
  );

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [defaultProvider, setDefaultProvider] = useState("anthropic");
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-4-6");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setApiKeys(userData.apiKeys || {});
      setDefaultProvider(userData.defaultProvider || "anthropic");
      setDefaultModel(userData.defaultModel || "claude-sonnet-4-6");
    }
  }, [userData]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        userDoc(user.uid),
        {
          displayName: user.displayName || "",
          email: user.email || "",
          apiKeys,
          defaultProvider,
          defaultModel,
          updatedAt: serverTimestamp(),
          ...(userData ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">Settings</h1>
      </SlideUp>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((p) => (
            <div key={p.id} className="space-y-1">
              <Label>{p.name} API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKeys[p.id] ? "text" : "password"}
                  value={apiKeys[p.id] || ""}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, [p.id]: e.target.value })
                  }
                  placeholder={`Enter your ${p.name} API key...`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setShowKeys({ ...showKeys, [p.id]: !showKeys[p.id] })
                  }
                >
                  {showKeys[p.id] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Provider</Label>
            <Select value={defaultProvider} onValueChange={setDefaultProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Model</Label>
            <Input
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
