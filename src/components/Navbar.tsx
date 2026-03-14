"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const SteamIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
  </svg>
);

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Find Match", href: "/queue" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Teams", href: "/teams" },
  ];

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-transparent p-12 lg:w-80">
      {/* Logo / Game Title */}
      <div className="mb-12">
        <Link href="/" className="group block">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] group-hover:text-primary transition-colors">
            FLUIDRUSH
          </h1>
          <div className="mt-1 h-1 w-12 bg-primary" />
        </Link>
      </div>

      {/* Main Menu Items */}
      <div className="flex flex-col gap-4">
        {session ? (
          <>
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                render={<Link href={item.href} />}
                className={cn(
                  "justify-start text-2xl font-bold uppercase tracking-tight shadow-none hover:bg-transparent px-0 transition-all",
                  pathname === item.href ? "text-primary translate-x-2" : "text-foreground"
                )}
              >
                {item.label}
              </Button>
            ))}
            
            <div className="mt-8 border-t border-white/10 pt-8">
               <div className="mb-4 flex items-center gap-3">
                  <Avatar className="size-10 border border-[#555]">
                    <AvatarImage src={session.user.image} alt={session.user.name} />
                    <AvatarFallback>{session.user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold uppercase">{session.user.name}</span>
                    <Badge variant="outline" className="h-4 border-primary/50 bg-primary/10 px-1 text-[10px] text-primary">
                      {session.user.elo} ELO
                    </Badge>
                  </div>
               </div>

               <Button
                  variant="ghost"
                  onSelect={() => signOut({ callbackUrl: "/" })}
                  className="justify-start text-xl font-bold uppercase tracking-tight text-muted-foreground hover:bg-transparent hover:text-destructive px-0"
                >
                  QUIT
                </Button>
            </div>
          </>
        ) : (
          <Button 
            render={<a href="/api/steam" />} 
            className="mt-4 gap-2 border border-[#555] bg-gradient-to-b from-[#4c4c4c] to-[#3a3a3a] text-sm font-bold uppercase"
          >
            <SteamIcon />
            Sign in with Steam
          </Button>
        )}
      </div>

      {/* Footer / Info */}
      <div className="mt-auto text-[10px] font-mono text-muted-foreground/50 uppercase">
        FluidRush V1.0.24 (VALVE)
        <br />
        Build: 2026.03.14
      </div>
    </nav>
  );
}
