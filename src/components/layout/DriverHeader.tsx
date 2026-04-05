"use client";

import { useAuth } from "@/context/AuthContext";
import { LogOut, CarFront } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DriverHeader() {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <div className="flex bg-primary w-8 h-8 rounded justify-center items-center text-primary-foreground me-2">
          <CarFront size={18} />
        </div>
        <div className="font-bold me-4">
          <Link href="/driver/dashboard">FMAC Fleet</Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium ms-4 hidden md:flex">
          <Link href="/driver/dashboard" className="transition-colors hover:text-foreground/80 text-foreground">
            Log Trip
          </Link>
          <Link href="/driver/history" className="transition-colors hover:text-foreground/80 text-foreground/60">
            My History
          </Link>
        </nav>
        <div className="ms-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign Out">
            <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
      {/* Mobile nav links */}
      <div className="flex md:hidden h-10 items-center justify-around border-t bg-muted/20 text-sm font-medium">
        <Link href="/driver/dashboard" className="py-2 px-4 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">Log Trip</Link>
        <Link href="/driver/history" className="py-2 px-4 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">My History</Link>
      </div>
    </header>
  );
}
