"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Player {
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

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?limit=50")
      .then(r => r.json())
      .then(d => { setPlayers(d.players ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-muted-foreground">Top players ranked by ELO</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Top 50 Players</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">ELO</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="text-center">Win %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="mx-auto h-4 w-6" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="mx-auto h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="mx-auto h-4 w-10" /></TableCell>
                    </TableRow>
                  ))
                ) : players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No players yet. Be the first to play a match!
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((p) => {
                    const isMe = session?.user?.id === p.id;
                    const medal = MEDALS[p.rank - 1];
                    return (
                      <TableRow
                        key={p.id}
                        className={cn(
                          isMe && "ring-1 ring-inset ring-primary/40 bg-primary/5",
                          p.rank === 1 && "bg-yellow-500/5",
                          p.rank === 2 && "bg-zinc-400/5",
                          p.rank === 3 && "bg-orange-700/5",
                        )}
                      >
                        <TableCell className="text-center font-bold">
                          {medal ? (
                            <span className="text-base">{medal}</span>
                          ) : (
                            <span className="text-muted-foreground">#{p.rank}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarImage src={p.avatar} alt={p.displayName} />
                              <AvatarFallback>{p.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <Link href={`/players/${p.id}`} className="font-medium transition-colors hover:text-primary">
                              {p.displayName}
                            </Link>
                            {isMe && (
                              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] px-1.5">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-primary">{p.elo}</TableCell>
                        <TableCell className="text-center text-green-400">{p.wins}</TableCell>
                        <TableCell className="text-center text-destructive">{p.losses}</TableCell>
                        <TableCell className="text-center">{p.winRate}%</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
