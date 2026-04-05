"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Car, LayoutDashboard, Wrench, FileText, Settings, LogOut, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Vehicles", href: "/admin/vehicles", icon: Car },
  { name: "Maintenance", href: "/admin/maintenance", icon: Wrench },
  { name: "Reports", href: "/admin/reports", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex h-full w-64 flex-col border-e bg-card px-3 py-4">
      <div className="mb-6 px-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center">
          <Car size={18} />
        </div>
        <span className="font-bold tracking-tight text-lg">{t('fmac_fleet')}</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "me-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {t(item.name.toLowerCase())}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        <button
          onClick={signOut}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="me-3 h-5 w-5 flex-shrink-0" />
          {t('sign_out')}
        </button>
      </div>
    </div>
  );
}
