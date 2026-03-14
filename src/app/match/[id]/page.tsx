"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchPlayer {
  id: string;
  team: "TEAM_A" | "TEAM_B";
  isCaptain: boolean;
  kills: number;
  deaths: number;
  assists: number;
  eloChange: number;
  user: {
    id: string;
    steamId: string;
    displayName: string;
    avatar: string;
    elo: number;
  };
}

interface MatchData {
  id: string;
  status: string;
  map: string;
  region: string;
  serverIp: string | null;
  serverPort: number | null;
  connectString: string | null;
  scoreTeamA: number;
  scoreTeamB: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  players: MatchPlayer[];
  server: {
    ip: string;
    port: number;
    status: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass?: string }
> = {
  READY_CHECK: {
    label: "Ready Check",
    badgeClass: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  },
  CONFIGURING: {
    label: "Setting Up Server",
    badgeClass: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  },
  WARMUP: {
    label: "Warmup",
    badgeClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  },
  KNIFE: {
    label: "Knife Round",
    badgeClass: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  },
  LIVE: {
    label: "LIVE",
    badgeClass: "border-green-500/40 bg-green-500/10 text-green-400",
    dotClass: "bg-green-400 animate-pulse",
  },
  FINISHED: {
    label: "Finished",
    badgeClass: "border-gray-500/40 bg-gray-500/10 text-gray-400",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "border-red-500/40 bg-red-500/10 text-red-400",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch match data & poll every 5 s
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
        } else {
          setError("Match not found");
        }
      } catch {
        setError("Failed to load match");
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
    const interval = setInterval(fetchMatch, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Header skeleton */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>

          {/* Scoreboard skeleton */}
          <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
            <div className="hidden items-center justify-center md:flex">
              <Skeleton className="h-14 w-16 rounded-xl" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error || !match) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="mb-4 text-xl text-red-400">{error}</p>
            <Button variant="outline" size="lg" onClick={() => router.push("/queue")}>
              Back to Queue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Data derived values ----
  const teamA = match.players.filter((p) => p.team === "TEAM_A");
  const teamB = match.players.filter((p) => p.team === "TEAM_B");
  const statusCfg = STATUS_CONFIG[match.status] ?? {
    label: match.status,
    badgeClass: "border-gray-500/40 bg-gray-500/10 text-gray-400",
  };
  const showStats = match.status === "LIVE" || match.status === "FINISHED";
  const showConnect =
    match.connectString &&
    ["WARMUP", "KNIFE", "LIVE"].includes(match.status);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ---- Match Header ---- */}
        <div className="mb-8 text-center">
          <Badge
            className={cn(
              "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              statusCfg.badgeClass
            )}
          >
            {statusCfg.dotClass && (
              <span className={cn("inline-block size-2 rounded-full", statusCfg.dotClass)} />
            )}
            {statusCfg.label}
          </Badge>

          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Match #{matchId.slice(0, 8)}
          </h1>

          <p className="text-muted-foreground">
            Map: <span className="font-medium text-foreground">{match.map}</span>
            {" | "}
            Region: <span className="font-medium text-foreground">{match.region}</span>
          </p>
        </div>

        {/* ---- Connect Button ---- */}
        {showConnect && (
          <div className="mx-auto mb-8 max-w-md text-center">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-700 py-6 text-lg font-bold text-white shadow-lg hover:from-green-700 hover:to-emerald-800"
              render={<a href={match.connectString!} />}
            >
              Connect to Server
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              {match.serverIp}:{match.serverPort}
            </p>
          </div>
        )}

        {/* ---- Configuring state ---- */}
        {match.status === "CONFIGURING" && (
          <Card className="mx-auto mb-8 max-w-md border-blue-500/30 bg-blue-500/5">
            <CardContent className="py-2 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="size-3 animate-bounce rounded-full bg-blue-400" />
                <span
                  className="size-3 animate-bounce rounded-full bg-blue-400"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="size-3 animate-bounce rounded-full bg-blue-400"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
              <p className="font-semibold text-blue-400">
                Provisioning game server...
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This may take 1-3 minutes
              </p>
            </CardContent>
          </Card>
        )}

        {/* ---- Scoreboard ---- */}
        <div className="grid items-start gap-6 md:grid-cols-[1fr_auto_1fr]">
          {/* Team A */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-orange-400">Team A</h2>
              {showStats && (
                <span className="text-3xl font-bold text-foreground">
                  {match.scoreTeamA}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {teamA.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentUser={session?.user?.id === player.user.id}
                  showStats={showStats}
                />
              ))}
            </div>
          </div>

          {/* VS divider */}
          <div className="hidden items-center justify-center pt-12 md:flex">
            <Card className="px-6 py-4">
              <p className="text-2xl font-bold text-muted-foreground">VS</p>
            </Card>
          </div>

          {/* Mobile separator */}
          <Separator className="my-2 md:hidden" />

          {/* Team B */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-blue-400">Team B</h2>
              {showStats && (
                <span className="text-3xl font-bold text-foreground">
                  {match.scoreTeamB}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {teamB.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentUser={session?.user?.id === player.user.id}
                  showStats={showStats}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ---- Bottom action ---- */}
        <div className="mt-10 flex justify-center">
          <Button variant="outline" size="lg" onClick={() => router.push("/queue")}>
            Back to Queue
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player card
// ---------------------------------------------------------------------------

function PlayerCard({
  player,
  isCurrentUser,
  showStats,
}: {
  player: MatchPlayer;
  isCurrentUser: boolean;
  showStats: boolean;
}) {
  return (
    <TooltipProvider>
      <Card
        size="sm"
        className={cn(
          "flex-row items-center gap-3 p-3",
          isCurrentUser
            ? "ring-1 ring-orange-500/50"
            : "ring-1 ring-foreground/10"
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Avatar size="lg">
                <AvatarImage src={player.user.avatar} alt={player.user.displayName} />
                <AvatarFallback>
                  {player.user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            }
          />
          <TooltipContent>{player.user.displayName}</TooltipContent>
        </Tooltip>

        {/* Name + ELO */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {player.user.displayName}
            </span>

            {player.isCaptain && (
              <Badge className="border-yellow-500/40 bg-yellow-500/10 px-1.5 text-[10px] text-yellow-400">
                C
              </Badge>
            )}

            {isCurrentUser && (
              <Badge className="border-orange-500/40 bg-orange-500/10 px-1.5 text-[10px] text-orange-400">
                You
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">ELO: {player.user.elo}</p>
        </div>

        {/* K / D / A + ELO change */}
        {showStats && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="text-center">
              <p className="font-medium text-foreground">{player.kills}</p>
              <p className="text-xs">K</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{player.deaths}</p>
              <p className="text-xs">D</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{player.assists}</p>
              <p className="text-xs">A</p>
            </div>
            {player.eloChange !== 0 && (
              <div className="text-center">
                <p
                  className={cn(
                    "font-medium",
                    player.eloChange > 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {player.eloChange > 0 ? "+" : ""}
                  {player.eloChange}
                </p>
                <p className="text-xs">ELO</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
