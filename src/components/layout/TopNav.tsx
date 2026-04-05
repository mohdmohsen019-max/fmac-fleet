"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Image from "next/image";

interface NavItem {
  key: string;
  href: string;
}

const adminNavItems: NavItem[] = [
  { key: "dashboard",    href: "/admin/dashboard" },
  { key: "users",        href: "/admin/users" },
  { key: "vehicles",     href: "/admin/vehicles" },
  { key: "maintenance",  href: "/admin/maintenance" },
  { key: "reports",      href: "/admin/reports" },
  { key: "behavior",     href: "/admin/behavior" },
  { key: "settings",     href: "/admin/settings" },
];

const driverNavItems: NavItem[] = [
  { key: "log_new_trip", href: "/driver/dashboard" },
  { key: "trip_history", href: "/driver/history" },
];

interface TopNavProps {
  mode: "admin" | "driver";
}

export function TopNav({ mode }: TopNavProps) {
  const pathname  = usePathname();
  const { profile, signOut } = useAuth();
  const { t }     = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const items = mode === "admin" ? adminNavItems : driverNavItems;
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backgroundColor: "#f9ecdb",
        borderBottom: "1px solid rgba(146,111,107,0.18)",
      }}
    >
      {/* ── Main bar ── */}
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16">

        {/* Logo */}
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            href={mode === "admin" ? "/admin/dashboard" : "/driver/dashboard"}
            className="flex items-center flex-shrink-0"
          >
            <img
              src="/fmac-logo.png"
              alt="FMAC"
              style={{ height: "32px", width: "auto", objectFit: "contain", maxWidth: "90px" }}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium transition-colors duration-150 whitespace-nowrap"
                  style={{
                    color: active ? "#c70017" : "#5d3f3c",
                    borderBottom: active ? "2px solid #c70017" : "2px solid transparent",
                    paddingBottom: "2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = "#c70017";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = "#5d3f3c";
                  }}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* User chip — desktop */}
          {profile && (
            <span
              className="hidden md:inline-block text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-sm"
              style={{ backgroundColor: "#ede1cf", color: "#5d3f3c", letterSpacing: "0.08em" }}
            >
              {profile.displayName || profile.email?.split("@")[0] || (mode === "admin" ? "Admin" : "Driver")}
            </span>
          )}

          {/* Sign out — desktop */}
          <button
            onClick={signOut}
            className="hidden md:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors duration-150"
            style={{ color: "#5d3f3c" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#c70017"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#5d3f3c"; }}
          >
            <LogOut size={14} />
            {t("sign_out")}
          </button>

          {/* Hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-sm transition-colors duration-150"
            style={{ color: "#5d3f3c" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {/* Animated icon: rotate X when open */}
            <span
              className="relative flex items-center justify-center"
              style={{
                transition: "transform 300ms ease",
                transform: mobileOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile slide-down panel ── */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: mobileOpen ? "420px" : "0px",
          opacity: mobileOpen ? 1 : 0,
          transition: "max-height 340ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
          backgroundColor: "#f9ecdb",
          borderTop: mobileOpen ? "1px solid rgba(146,111,107,0.18)" : "1px solid transparent",
        }}
      >
        <nav className="flex flex-col px-4 pt-2 pb-4 gap-0.5">
          {items.map((item, idx) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="py-3 px-3 text-sm font-medium rounded-sm transition-colors duration-150"
                style={{
                  color: active ? "#c70017" : "#5d3f3c",
                  backgroundColor: active ? "rgba(199,0,23,0.06)" : "transparent",
                  borderLeft: active ? "2px solid #c70017" : "2px solid transparent",
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {t(item.key)}
              </Link>
            );
          })}

          {/* Divider + sign out */}
          <div
            className="mt-3 pt-3"
            style={{ borderTop: "1px solid rgba(146,111,107,0.18)" }}
          >
            {profile && (
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3 px-3 truncate"
                style={{ color: "#5d3f3c" }}
              >
                {profile.displayName || profile.email}
              </p>
            )}
            <button
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="flex items-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-sm w-full text-left transition-colors duration-150"
              style={{ color: "#c70017" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(199,0,23,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <LogOut size={14} />
              {t("sign_out")}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
