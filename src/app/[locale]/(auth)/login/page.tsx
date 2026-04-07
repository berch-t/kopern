"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail } from "@/lib/firebase/auth";
import { getAuth } from "firebase/auth";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { userDoc } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FadeIn } from "@/components/motion/FadeIn";
import { LocalizedLink } from "@/components/LocalizedLink";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const t = useDictionary();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function postLoginActions() {
    if (from === "monitor") {
      try {
        const user = getAuth().currentUser;
        if (user) {
          const token = await user.getIdToken();
          await fetch("/api/monitor/setup-team", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {
        // Non-blocking — team creation failure shouldn't block login
      }
    }
    router.push("/dashboard");
  }

  async function handleOAuth(provider: "google" | "github") {
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        const { result, githubAccessToken } = await signInWithGithub();
        if (githubAccessToken && result.user) {
          await setDoc(userDoc(result.user.uid), {
            githubAccessToken,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
      await postLoginActions();
    } catch (err) {
      const authErr = err as { code?: string; message?: string };
      console.error("OAuth error:", err);
      // User cancelled the popup — don't show error toast
      if (authErr.code === "auth/popup-closed-by-user" || authErr.code === "auth/cancelled-popup-request") {
        return;
      }
      // Email already used with a different provider (e.g. Google)
      if (authErr.message === "github_needs_google_first" || authErr.code === "auth/account-exists-with-different-credential") {
        toast.error(t.auth.githubNeedsGoogle, { duration: 8000 });
        return;
      }
      // Popup blocked by browser
      if (authErr.code === "auth/popup-blocked") {
        toast.error(t.auth.popupBlocked);
        return;
      }
      toast.error(t.auth.failedOAuth.replace("{provider}", provider));
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      await postLoginActions();
    } catch (err) {
      toast.error(isSignUp ? t.auth.failedSignUp : t.auth.failedSignIn);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FadeIn>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <LocalizedLink href="/" className="mx-auto mb-2 block hover:opacity-80 transition-opacity">
            <img src="/logo_pix.png" alt="Kopern" className="h-12" />
          </LocalizedLink>
          <CardTitle className="text-2xl">{t.auth.title}</CardTitle>
          <CardDescription>
            {t.auth.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => handleOAuth("google")}>
              {t.auth.google}
            </Button>
            <Button variant="outline" onClick={() => handleOAuth("github")}>
              {t.auth.github}
            </Button>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.common.loading : isSignUp ? t.auth.signUpBtn : t.auth.signInBtn}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? t.auth.switchToSignIn : t.auth.switchToSignUp}{" "}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? t.common.signIn : t.auth.signUp}
            </button>
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
