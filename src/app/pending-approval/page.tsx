"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Clock } from "lucide-react";

export default function PendingApprovalPage() {
  const { profile, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.approved) router.push("/");
  }, [profile, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#fff8f2" }}>
      <img
        src="/fmac-logo.png"
        alt="FMAC"
        className="h-12 w-auto object-contain mx-auto mb-10"
      />

      <div className="w-full max-w-sm rounded-sm p-8 text-center" style={{ backgroundColor: "#ffffff", boxShadow: "0 0 24px -4px rgba(33,27,16,0.06)" }}>
        <div className="w-14 h-14 rounded-sm flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "#fff2e0" }}>
          <Clock size={24} style={{ color: "#c70017" }} />
        </div>
        <p className="pl-overline mb-2">Access Control</p>
        <h1 className="text-xl font-semibold mb-4" style={{ color: "#211b10" }}>Pending Approval</h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#5d3f3c" }}>
          Your account has been created and is awaiting administrator approval. Please contact your fleet manager to activate your access.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="btn-precision w-full py-3"
          >
            Refresh Status
          </button>
          <button
            onClick={signOut}
            className="btn-secondary w-full py-3"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
