"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardPlayer {
  id: string;
  steamId: string;
  displayName: string;
  avatar: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
  totalMatches: number;
  winRate: number;
}

const RANK_STYLES: Record<number, { badge: string; row: string; icon: string }> = {
  1: {
    badge: "border-yellow-500/40 bg-yellow-500/15 text-yellow-400",
    row: "bg-yellow-500/5",
    icon: "🥇",
  },
  2: {
    badge: "border-gray-400/40 bg-gray-400/15 text-gray-300",
    row: "bg-gray-400/5",
    icon: "🥈",
  },
  3: {
    badge: "border-orange-700/40 bg-orange-700/15 text-orange-400",
    row: "bg-orange-700/5",
    icon: "🥉",
  },
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-8" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-12 mx-auto" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8 mx-auto" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-8 mx-auto" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-10 mx-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?limit=50")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data.players);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="mt-2 text-muted-foreground">
            Top players ranked by ELO
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && players.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">No players yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to play a match and appear on the leaderboard!
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">ELO</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center">Losses</TableHead>
                    <TableHead className="text-center">Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <SkeletonRows />
                  ) : (
                    players.map((player) => {
                      const isCurrentUser = session?.user?.id === player.id;
                      const rankStyle = RANK_STYLES[player.rank];

                      return (
                        <TableRow
                          key={player.id}
                          className={`
                            ${rankStyle?.row ?? ""}
                            ${isCurrentUser ? "ring-1 ring-primary/50 ring-inset" : ""}
                          `}
                        >
                          {/* Rank */}
                          <TableCell>
                            {rankStyle ? (
                              <Badge
                                variant="outline"
                                className={`font-bold ${rankStyle.badge}`}
                              >
                                {rankStyle.icon} #{player.rank}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground font-medium pl-1">
                                #{player.rank}
                              </span>
                            )}
                          </TableCell>

                          {/* Player */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="default">
                                <AvatarImage
                                  src={player.avatar}
                                  alt={player.displayName}
                                />
                                <AvatarFallback>
                                  {player.displayName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate max-w-[200px]">
                                {player.displayName}
                              </span>
                              {isCurrentUser && (
                                <Badge
                                  variant="outline"
                                  className="border-primary/30 bg-primary/10 text-primary"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* ELO */}
                          <TableCell className="text-center">
                            <span className="font-bold text-primary">
                              {player.elo}
                            </span>
                          </TableCell>

                          {/* Wins */}
                          <TableCell className="text-center text-green-400">
                            {player.wins}
                          </TableCell>

                          {/* Losses */}
                          <TableCell className="text-center text-red-400">
                            {player.losses}
                          </TableCell>

                          {/* Win Rate */}
                          <TableCell className="text-center">
                            {player.winRate}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
