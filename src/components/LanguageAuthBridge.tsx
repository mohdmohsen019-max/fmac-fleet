"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Invisible bridge component that wires the user's preferredLanguage
 * from Firestore (loaded by AuthContext) into LanguageContext.
 * Placed inside both providers in layout.tsx.
 */
export function LanguageAuthBridge() {
  const { profile } = useAuth();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    if (profile?.preferredLanguage) {
      setLanguage(profile.preferredLanguage);
    }
  }, [profile?.preferredLanguage]);

  return null;
}
