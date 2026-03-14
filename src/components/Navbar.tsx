"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/queue", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/teams", label: "Teams" },
] as const;

function SteamIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 259"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M128.007 0C58.652 0 2.076 53.308.085 121.392l68.91 28.49c5.857-3.981 12.91-6.327 20.51-6.327.68 0 1.348.028 2.01.07l30.711-44.468v-.624c0-26.644 21.69-48.335 48.336-48.335 26.644 0 48.334 21.691 48.334 48.372 0 26.645-21.69 48.336-48.37 48.336h-1.12l-43.752 31.24c0 .53.036 1.058.036 1.573 0 19.96-16.222 36.2-36.2 36.2-17.654 0-32.39-12.71-35.559-29.467L4.535 163.57C22.608 217.32 71.026 258.372 128.007 258.372c70.69 0 127.993-57.303 127.993-128.004C256 59.36 198.697 0 128.007 0zM80.45 207.805l-15.617-6.455c2.77 5.77 7.596 10.636 13.924 13.437 13.724 6.074 29.768-.282 35.842-14.006 2.934-6.631 2.978-13.9.114-20.571-2.858-6.67-8.168-11.86-14.8-14.8-6.545-2.89-13.56-2.77-19.71-.398l16.148 6.68c10.11 4.476 14.668 16.366 10.185 26.47-4.477 10.105-16.353 14.663-26.486 10.188v-.545zm113.113-98.452c0-17.738-14.444-32.188-32.224-32.188-17.745 0-32.189 14.45-32.189 32.188 0 17.745 14.444 32.189 32.189 32.189 17.78 0 32.224-14.444 32.224-32.189zm-56.346.063c0-13.418 10.87-24.29 24.19-24.29 13.37 0 24.196 10.872 24.196 24.29 0 13.38-10.826 24.253-24.196 24.253-13.32 0-24.19-10.873-24.19-24.253z" />
    </svg>
  );
}

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40",
        "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold text-white shadow-lg shadow-orange-500/20">
            FR
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            FluidRush
          </span>
        </Link>

        {/* Nav Links - hidden on mobile */}
        {session && (
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Button
                key={href}
                variant="ghost"
                size="sm"
                render={<Link href={href} />}
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        {/* Right side */}
        {session ? (
          <div className="flex items-center gap-3">
            {/* ELO Badge - visible on sm+ */}
            <Badge
              variant="outline"
              className="hidden sm:inline-flex border-orange-500/30 bg-orange-500/10 text-orange-400"
            >
              ELO {session.user.elo}
            </Badge>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                  "bg-muted/50 hover:bg-muted transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Avatar size="sm">
                  <AvatarImage
                    src={session.user.image}
                    alt={session.user.name}
                  />
                  <AvatarFallback>
                    {session.user.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {session.user.name}
                </span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8} className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-orange-400">
                      ELO: {session.user.elo}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<a href="/api/auth/steam" />}
            className="gap-2"
          >
            <SteamIcon className="size-4" />
            Sign in with Steam
          </Button>
        )}
      </div>
    </nav>
  );
}
