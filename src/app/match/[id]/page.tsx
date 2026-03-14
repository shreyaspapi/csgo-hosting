"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMapName } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface MatchPlayer {
  id: string;
  team: "TEAM_A" | "TEAM_B";
  isCaptain: boolean;
  kills: number;
  deaths: number;
  assists: number;
  eloChange: number;
  user: { id: string; steamId: string; displayName: string; avatar: string; elo: number };
}

interface MatchData {
  id: string;
  status: string;
  map: string;
  selectedMap?: string;
  teamAName?: string;
  teamBName?: string;
  region: string;
  serverIp: string | null;
  serverPort: number | null;
  connectString: string | null;
  scoreTeamA: number;
  scoreTeamB: number;
  players: MatchPlayer[];
  server: { ip: string; port: number; status: string } | null;
  readyChecks?: { userId: string; status: string }[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  READY_CHECK: { label: "Ready Check", cls: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" },
  CONFIGURING: { label: "Setting Up Server", cls: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
  WARMUP: { label: "Warmup", cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" },
  KNIFE: { label: "Knife Round", cls: "border-purple-500/30 bg-purple-500/10 text-purple-400" },
  LIVE: { label: "LIVE", cls: "border-green-500/30 bg-green-500/10 text-green-400" },
  FINISHED: { label: "Finished", cls: "border-border bg-muted text-muted-foreground" },
  CANCELLED: { label: "Cancelled", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export default function MatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id: matchId } = useParams() as { id: string };

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`);
        if (res.ok) setMatch(await res.json());
        else setError("Match not found");
      } catch {
        setError("Failed to load match");
      } finally {
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Skeleton className="mx-auto mb-4 h-8 w-48" />
          <Skeleton className="mx-auto mb-10 h-4 w-64" />
          <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            <Skeleton className="hidden h-20 w-16 md:block" />
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-xl text-destructive">{error}</p>
          <Button variant="outline" onClick={() => router.push("/queue")}>
            Back to Queue
          </Button>
        </div>
      </div>
    );
  }

  const teamA = match.players.filter((p) => p.team === "TEAM_A");
  const teamB = match.players.filter((p) => p.team === "TEAM_B");
  const info = STATUS[match.status] ?? { label: match.status, cls: "border-border" };
  const showStats = ["LIVE", "FINISHED"].includes(match.status);
  const canConnect = match.connectString && ["WARMUP", "KNIFE", "LIVE"].includes(match.status);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <Badge variant="outline" className={cn("mb-3 gap-1.5", info.cls)}>
            {match.status === "LIVE" && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-400" />
              </span>
            )}
            {info.label}
          </Badge>
          <h1 className="text-3xl font-bold">Match #{matchId.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMapName(match.selectedMap ?? match.map)} · {match.region}
          </p>
        </div>

        {canConnect && (
          <div className="mb-8 text-center">
            <Button
              size="lg"
              className="bg-green-600 px-12 text-white shadow-lg shadow-green-600/25 hover:bg-green-700"
              render={<a href={match.connectString!} />}
            >
              Connect to Server
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              {match.serverIp}:{match.serverPort}
            </p>
          </div>
        )}

        {match.status === "CONFIGURING" && (
          <Card className="mb-8 border-blue-500/30 bg-blue-500/5 text-center">
            <CardContent className="py-8">
              <div className="mb-3 flex items-center justify-center gap-1.5">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    className="size-2 animate-bounce rounded-full bg-blue-400"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <p className="font-semibold text-blue-400">Provisioning game server...</p>
              <p className="mt-1 text-sm text-muted-foreground">This may take 1-3 minutes</p>
            </CardContent>
          </Card>
        )}

        <div className="grid items-start gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-primary">{match.teamAName ?? "Team A"}</span>
              {showStats && <span className="text-3xl font-bold">{match.scoreTeamA}</span>}
            </div>
            <div className="space-y-2">
              {teamA.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isMe={session?.user?.id === player.user.id}
                  showStats={showStats}
                />
              ))}
            </div>
          </div>

          <div className="hidden items-center justify-center pt-10 md:flex">
            <Card size="sm">
              <CardContent className="px-5 py-3 text-xl font-bold text-muted-foreground">
                VS
              </CardContent>
            </Card>
          </div>
          <Separator className="md:hidden" />

          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-blue-400">{match.teamBName ?? "Team B"}</span>
              {showStats && <span className="text-3xl font-bold">{match.scoreTeamB}</span>}
            </div>
            <div className="space-y-2">
              {teamB.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isMe={session?.user?.id === player.user.id}
                  showStats={showStats}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button variant="outline" onClick={() => router.push("/queue")}>
            Back to Queue
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  isMe,
  showStats,
}: {
  player: MatchPlayer;
  isMe: boolean;
  showStats: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        isMe ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
      )}
    >
      <Avatar size="default">
        <AvatarImage src={player.user.avatar} alt={player.user.displayName} />
        <AvatarFallback>{player.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/players/${player.user.id}`} className="truncate text-sm font-medium transition-colors hover:text-primary">
            {player.user.displayName}
          </Link>
          {player.isCaptain && (
            <Badge variant="outline" className="border-yellow-500/30 px-1.5 py-0 text-[10px] text-yellow-400">
              C
            </Badge>
          )}
          {isMe && (
            <Badge variant="outline" className="border-primary/30 px-1.5 py-0 text-[10px] text-primary">
              You
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">ELO {player.user.elo}</p>
      </div>
      {showStats && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-center">
            <span className="font-semibold">{player.kills}</span>
            <span className="block text-[10px] text-muted-foreground">K</span>
          </span>
          <span className="text-center">
            <span className="font-semibold">{player.deaths}</span>
            <span className="block text-[10px] text-muted-foreground">D</span>
          </span>
          <span className="text-center">
            <span className="font-semibold">{player.assists}</span>
            <span className="block text-[10px] text-muted-foreground">A</span>
          </span>
          {player.eloChange !== 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                player.eloChange > 0 ? "border-green-500/30 text-green-400" : "border-destructive/30 text-destructive"
              )}
            >
              {player.eloChange > 0 ? "+" : ""}
              {player.eloChange}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
