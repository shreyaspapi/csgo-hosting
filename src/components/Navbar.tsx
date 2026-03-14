"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const SteamIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
  </svg>
);

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't render the sidebar at all on the landing page for unauthenticated users.
  // The landing page handles its own full-canvas layout.
  if (pathname === "/" && !session && status !== "loading") return null;

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Find Match", href: "/queue" },
    { label: "Matches", href: "/matches" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Teams", href: "/teams" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(18,20,22,0.86)] px-4 py-4 backdrop-blur-md lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[19rem] lg:border-b-0 lg:border-r lg:border-white/8 lg:bg-[var(--menu-panel)] lg:px-8 lg:py-10">
      <div className="flex items-center justify-between lg:block">
        <div className="mb-0 lg:mb-10">
          <Link href="/" className="group block">
            <div className="menu-title text-[0.68rem] text-muted-foreground">Matchmaking Interface</div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-[0.26em] text-foreground transition-colors group-hover:text-primary lg:text-[2.6rem] lg:tracking-[0.38em]">
              FLUIDRUSH
            </h1>
            <div className="menu-divider mt-3 w-24 lg:w-36" />
          </Link>
        </div>

        {session ? (
          <div className="hidden lg:flex lg:h-[calc(100%-5.5rem)] lg:flex-col">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  render={<Link href={item.href} />}
                  className={cn(
                    "h-auto w-full justify-start border border-transparent px-3 py-3 text-left text-[0.95rem] font-bold uppercase tracking-[0.18em] text-[#d7d1c0] transition-all hover:border-primary/20 hover:bg-white/4 hover:text-primary",
                    pathname === item.href && "border-primary/30 bg-white/6 text-primary shadow-[inset_0_0_0_1px_rgba(211,162,59,0.12)]"
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="mt-auto border-t border-white/10 pt-6">
              <div className="mb-4 flex items-center gap-3 rounded-[2px] border border-white/8 bg-black/18 px-3 py-3">
                <Avatar className="size-11 border border-white/12">
                  <AvatarImage src={session.user.image} alt={session.user.name} />
                  <AvatarFallback>{session.user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold uppercase tracking-[0.14em]">{session.user.name}</div>
                  <Badge variant="outline" className="mt-1 border-primary/40 bg-primary/8 px-1.5 text-[10px] text-primary">
                    {session.user.elo} ELO
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="h-auto justify-start px-0 py-2 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground hover:bg-transparent hover:text-destructive"
              >
                Quit Session
              </Button>

              <div className="mt-6 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                FluidRush Source Build
                <br />
                Patch 2026.03.14
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block">
            <Button
              render={<a href="/api/steam" />}
              className="vgui-button mt-4 gap-2 px-4 py-3 text-sm"
            >
              <SteamIcon />
              Sign in with Steam
            </Button>
          </div>
        )}

        <div className="lg:hidden">
          {session ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-black/20 text-primary">
                {session.user.elo} ELO
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="icon" aria-label="Open menu">
                      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-48">
                  {navItems.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      render={<Link href={item.href} />}
                      className={cn(pathname === item.href && "text-primary")}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button render={<a href="/api/steam" />} size="sm" className="vgui-button gap-2 px-3">
              <SteamIcon />
              Steam
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
