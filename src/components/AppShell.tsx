"use client";

import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

/**
 * Applies the sidebar offset only when the user is authenticated
 * (i.e., when the Navbar sidebar is actually rendered).
 * Unauthenticated users get a full-width layout for the landing page.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  return (
    <div className={cn("min-h-screen", session && "lg:pl-[19rem]")}>
      {children}
    </div>
  );
}
