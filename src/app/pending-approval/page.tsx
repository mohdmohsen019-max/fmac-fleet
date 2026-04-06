"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Clock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function PendingApprovalPage() {
  const { profile, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.approved) router.push("/");
  }, [profile, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#fff8f2" }}>
      <img
        src="/favicon.png"
        alt="FMAC"
        className="h-20 w-20 object-contain mx-auto mb-10"
      />

      <div className="w-full max-w-sm rounded-sm p-8 text-center" style={{ backgroundColor: "#ffffff", boxShadow: "0 0 24px -4px rgba(33,27,16,0.06)" }}>
        <div className="w-14 h-14 rounded-sm flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "#fff2e0" }}>
          <Clock size={24} style={{ color: "#c70017" }} />
        </div>
        <p className="pl-overline mb-2">{t("access control") || "Access Control"}</p>
        <h1 className="text-xl font-semibold mb-4" style={{ color: "#211b10" }}>{t("pending approval")}</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#5d3f3c" }}>
          {t("pending desc")}
        </p>
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="btn-precision w-full py-3"
          >
            {t("refresh status")}
          </button>
          <button
            onClick={signOut}
            className="btn-secondary w-full py-3"
          >
            {t("sign out")}
          </button>
        </div>
      </div>
    </div>
  );
}
