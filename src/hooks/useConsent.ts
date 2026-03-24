"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { consentDoc } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsentPreferences {
  /** Essential cookies — always true */
  essential: true;
  /** Functional analytics (detailed sessions, error logs, per-agent breakdowns) */
  functional: boolean;
}

const STORAGE_KEY = "kopern_consent";

// ---------------------------------------------------------------------------
// localStorage helpers (work before auth)
// ---------------------------------------------------------------------------

function readLocalConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (typeof parsed.functional !== "boolean") return null;
    return { essential: true, functional: parsed.functional };
  } catch {
    return null;
  }
}

function writeLocalConsent(prefs: ConsentPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Hook — does NOT depend on AuthProvider context
// ---------------------------------------------------------------------------

export function useConsent() {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  // Listen for auth state independently of AuthProvider
  useEffect(() => {
    const local = readLocalConsent();
    if (local) {
      setConsent(local);
    }

    const unsubscribe = onAuthChanged((u) => {
      userRef.current = u;

      if (!u) {
        setLoading(false);
        return;
      }

      // Sync from Firestore when authenticated
      getDoc(consentDoc(u.uid))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const prefs: ConsentPreferences = {
              essential: true,
              functional: data.functional ?? false,
            };
            setConsent(prefs);
            writeLocalConsent(prefs);
          } else if (local) {
            // Push localStorage consent to Firestore
            setDoc(consentDoc(u.uid), {
              essential: true,
              functional: local.functional,
              consentedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              userAgent: navigator.userAgent,
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });

    // If no auth fires quickly, stop loading
    const timeout = setTimeout(() => setLoading(false), 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const updateConsent = useCallback(
    async (prefs: ConsentPreferences) => {
      const normalized: ConsentPreferences = { essential: true, functional: prefs.functional };
      setConsent(normalized);
      writeLocalConsent(normalized);

      const user = userRef.current;
      if (user) {
        try {
          await setDoc(consentDoc(user.uid), {
            essential: true,
            functional: normalized.functional,
            consentedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            userAgent: navigator.userAgent,
          });
        } catch {
          // Non-blocking
        }
      }
    },
    []
  );

  const acceptAll = useCallback(() => {
    return updateConsent({ essential: true, functional: true });
  }, [updateConsent]);

  const rejectNonEssential = useCallback(() => {
    return updateConsent({ essential: true, functional: false });
  }, [updateConsent]);

  return {
    consent,
    showBanner: !loading && consent === null,
    hasFunctionalConsent: consent?.functional ?? false,
    loading,
    updateConsent,
    acceptAll,
    rejectNonEssential,
  };
}

