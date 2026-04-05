"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getAllUsers } from "@/lib/services/userService";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage, NATIVE_LANGUAGE_NAMES, Language } from "@/context/LanguageContext";
import { Loader2, Check } from "lucide-react";

const LANG_OPTIONS: Language[] = ["en", "ar", "ur"];

export default function SignupPage() {
  const { t, setLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Language>("en");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError(t("password_min_6")); return; }
    if (password !== confirmPassword) { setError(t("passwords_no_match")); return; }
    setLoading(true);
    try {
      const existingUsers = await getAllUsers();
      const isFirstUser = existingUsers.length === 0;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid, email: user.email, displayName: fullName,
        role: isFirstUser ? "admin" : "driver", approved: isFirstUser,
        preferredLanguage, createdAt: Timestamp.now(),
      });
      setLanguage(preferredLanguage);
      router.push(isFirstUser ? "/admin/dashboard" : "/pending-approval");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full border px-4 py-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors";
  const labelCls = "block text-xs font-bold uppercase tracking-wide mb-2";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ backgroundColor: "#fff8f2" }}>

      <div className="mb-10 text-center">
        <img
          src="/fmac-logo.png"
          alt="FMAC"
          className="h-14 w-auto object-contain mx-auto mb-2"
        />
        <p className="pl-overline">Fleet Management System</p>
      </div>

      <div className="w-full max-w-md rounded-sm p-8" style={{ backgroundColor: "#ffffff", boxShadow: "0 0 24px -4px rgba(33,27,16,0.06)" }}>
        <p className="pl-overline mb-1">{t("register_desc")}</p>
        <h1 className="text-xl font-semibold mb-7" style={{ color: "#211b10" }}>{t("register")}</h1>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("full_name")}</label>
            <input type="text" required placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)}
              className={inputCls} style={{ borderColor: "rgba(146,111,107,0.25)" }} />
          </div>
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("email")}</label>
            <input type="email" required placeholder="driver@fmac.org" value={email} onChange={e => setEmail(e.target.value)}
              className={inputCls} style={{ borderColor: "rgba(146,111,107,0.25)" }} />
          </div>
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("password")}</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls} style={{ borderColor: "rgba(146,111,107,0.25)" }} />
          </div>
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("confirm_password")}</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className={inputCls} style={{ borderColor: "rgba(146,111,107,0.25)" }} />
          </div>

          {/* Language preference */}
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }}>{t("preferred_language")}</label>
            <p className="text-xs mb-3" style={{ color: "#a8a29e" }}>{t("preferred_language_desc")}</p>
            <div className="grid grid-cols-3 gap-2">
              {LANG_OPTIONS.map(lang => (
                <button
                  key={lang} type="button"
                  onClick={() => setPreferredLanguage(lang)}
                  className="px-3 py-3 text-center rounded-[4px] transition-all"
                  style={{
                    border: preferredLanguage === lang ? "1px solid #c70017" : "1px solid rgba(146,111,107,0.25)",
                    backgroundColor: preferredLanguage === lang ? "rgba(199,0,23,0.04)" : "#ffffff",
                    color: preferredLanguage === lang ? "#c70017" : "#211b10",
                  }}
                >
                  <p className="text-sm font-semibold">{NATIVE_LANGUAGE_NAMES[lang]}</p>
                  {preferredLanguage === lang && <Check size={10} className="mx-auto mt-1" style={{ color: "#c70017" }} />}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-[4px]" style={{ backgroundColor: "rgba(199,0,23,0.06)", color: "#c70017" }}>{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-precision w-full flex items-center justify-center gap-2 py-3">
            {loading ? <><Loader2 size={14} className="animate-spin" /> {t("creating")}</> : t("create_account")}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "#5d3f3c" }}>
          {t("already_account")}{" "}
          <Link href="/login" className="font-bold" style={{ color: "#c70017" }}>{t("log_in")}</Link>
        </p>
      </div>

      <p className="text-xs mt-8" style={{ color: "#a8a29e" }}>© {new Date().getFullYear()} FMAC Fleet Operations</p>
    </div>
  );
}
