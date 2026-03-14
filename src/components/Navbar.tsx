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

const SteamIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
  </svg>
);

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            FR
          </div>
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-xl font-bold text-transparent">
            FluidRush
          </span>
        </Link>

        {/* Nav links */}
        {session && (
          <div className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/queue" />}>
              Play
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/leaderboard" />}>
              Leaderboard
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/teams" />}>
              Teams
            </Button>
          </div>
        )}

        {/* Right: user menu or sign-in */}
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className={cn(
                  "flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm",
                  "transition-colors hover:bg-muted focus:outline-none"
                )} />
              }
            >
              <Avatar size="sm">
                <AvatarImage src={session.user.image} alt={session.user.name} />
                <AvatarFallback>{session.user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden font-medium sm:block">{session.user.name}</span>
              <Badge variant="outline" className="hidden border-primary/30 bg-primary/10 text-primary sm:inline-flex">
                {session.user.elo} ELO
              </Badge>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Signed in as {session.user.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/dashboard" />}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/queue" />}>
                Find Match
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button render={<a href="/api/steam" />} className="gap-2">
            <SteamIcon />
            Sign in with Steam
          </Button>
        )}
      </div>
    </nav>
  );
}
