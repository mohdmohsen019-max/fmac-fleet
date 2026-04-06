"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch {
      setError(t("invalid credentials"));
    } finally { setLoading(false); }
  };

  const inputCls = "w-full border px-4 py-3 text-sm bg-white rounded-[4px] focus:outline-none focus:border-[#c70017] transition-colors";
  const labelCls = "block text-xs font-bold uppercase tracking-wide mb-2";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#fff8f2" }}>

      {/* Logo area */}
      <div className="mb-10 text-center">
        <img
          src="/favicon.png?v=4"
          alt="FMAC"
          className="h-20 w-20 object-contain mx-auto mb-4"
        />
        <p className="pl-overline">Fleet Management System</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-sm p-8" style={{ backgroundColor: "#ffffff", boxShadow: "0 0 24px -4px rgba(33,27,16,0.06)" }}>
        <p className="pl-overline mb-1">{t("sign in title")}</p>
        <h1 className="text-xl font-semibold mb-7" style={{ color: "#211b10" }}>{t("welcome back")}</h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }} htmlFor="email">{t("email")}</label>
            <input
              id="email" type="email" required
              placeholder="driver@fmac.org"
              value={email} onChange={e => setEmail(e.target.value)}
              className={inputCls}
              style={{ borderColor: "rgba(146,111,107,0.25)" }}
            />
          </div>
          <div>
            <label className={labelCls} style={{ color: "#5d3f3c" }} htmlFor="password">{t("password")}</label>
            <input
              id="password" type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls}
              style={{ borderColor: "rgba(146,111,107,0.25)" }}
            />
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-[4px]" style={{ backgroundColor: "rgba(199,0,23,0.06)", color: "#c70017" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-precision w-full flex items-center justify-center gap-2 py-3">
            {loading ? <><Loader2 size={14} className="animate-spin" /> {t("signing in")}</> : t("sign in")}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "#5d3f3c" }}>
          {t("no account")}{" "}
          <Link href="/signup" className="font-bold transition-colors" style={{ color: "#c70017" }}>
            {t("sign up")}
          </Link>
        </p>
      </div>

      <p className="text-xs mt-8" style={{ color: "#a8a29e" }}>
        © {new Date().getFullYear()} FMAC Fleet Operations
      </p>
    </div>
  );
}
