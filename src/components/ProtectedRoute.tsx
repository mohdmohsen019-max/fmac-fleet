"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: ("admin" | "driver")[];
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile && !profile.approved) {
        router.push("/pending-approval");
      } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // Redirect unauthorized users to a default dashboard based on their role
        router.push(profile.role === "admin" ? "/admin/dashboard" : "/driver/dashboard");
      }
    }
  }, [user, profile, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render if user is authenticated, approved, and has required role (if specified)
  if (!user || (profile && !profile.approved) || (allowedRoles && profile && !allowedRoles.includes(profile.role))) {
    return null;
  }

  return <>{children}</>;
}
