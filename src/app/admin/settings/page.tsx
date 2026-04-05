"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage, NATIVE_LANGUAGE_NAMES, Language } from "@/context/LanguageContext";
import { Check } from "lucide-react";

const LANG_META: Record<Language, { layout: string }> = {
  en: { layout: "Left-to-right" },
  ar: { layout: "يمين إلى يسار" },
  ur: { layout: "دائیں سے بائیں" },
};

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { profile } = useAuth();

  return (
    <div className="space-y-12 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <p className="pl-overline mb-1">Configuration</p>
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#211b10" }}>{t("settings")}</h1>
      </div>

      {/* ── Profile Section ── */}
      <section>
        <p className="pl-overline mb-6">{t("profile_settings")}</p>
        <div className="rounded-sm overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="p-5 sm:p-6" style={{ borderBottom: "1px solid rgba(146,111,107,0.1)", borderRight: "1px solid rgba(146,111,107,0.1)" }}>
              <p className="pl-overline mb-1">{t("full_name")}</p>
              <p className="text-base font-semibold mt-1" style={{ color: "#211b10" }}>{profile?.displayName || "—"}</p>
              <p className="text-xs mt-1" style={{ color: "#a8a29e" }}>{t("name_synced")}</p>
            </div>
            <div className="p-5 sm:p-6" style={{ borderBottom: "1px solid rgba(146,111,107,0.1)" }}>
              <p className="pl-overline mb-1">{t("email_address")}</p>
              <p className="text-base font-semibold mt-1 break-all" style={{ color: "#211b10" }}>{profile?.email || "—"}</p>
              <p className="text-xs mt-1" style={{ color: "#a8a29e" }}>{t("primary_email")}</p>
            </div>
            <div className="p-5 sm:p-6">
              <p className="pl-overline mb-1">{t("role")}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="fleet-chip">{profile?.role === "admin" ? t("administrator") : t("driver")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Language Section ── */}
      <section>
        <p className="pl-overline mb-1">{t("language")}</p>
        <p className="text-sm mb-6" style={{ color: "#5d3f3c" }}>{t("language_desc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["en", "ar", "ur"] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className="flex items-center justify-between p-5 rounded-sm text-left transition-all duration-150"
              style={{
                backgroundColor: language === lang ? "#ffffff" : "#f9ecdb",
                border: language === lang ? "1px solid #c70017" : "1px solid transparent",
                boxShadow: language === lang ? "0 0 0 1px rgba(199,0,23,0.15)" : "none",
              }}
            >
              <div>
                <p
                  className="text-lg font-semibold leading-none"
                  style={{ color: language === lang ? "#c70017" : "#211b10" }}
                >
                  {NATIVE_LANGUAGE_NAMES[lang]}
                </p>
                <p className="text-xs mt-1.5" style={{ color: "#5d3f3c" }}>{LANG_META[lang].layout}</p>
              </div>
              {language === lang && (
                <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ backgroundColor: "#c70017" }}>
                  <Check size={12} color="#ffffff" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
