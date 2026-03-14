import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/");

  const recentMatches = await prisma.matchPlayer.findMany({
    where: { userId: user.id },
    include: {
      match: {
        select: {
          id: true,
          status: true,
          map: true,
          scoreTeamA: true,
          scoreTeamB: true,
          createdAt: true,
          finishedAt: true,
        },
      },
    },
    orderBy: { match: { createdAt: "desc" } },
    take: 10,
  });

  const rank = await prisma.user.count({
    where: { elo: { gt: user.elo } },
  });

  const totalMatches = user.wins + user.losses + user.draws;
  const winRate =
    user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100)
      : 0;

  const activeQueue = await prisma.queueEntry.findFirst({
    where: {
      userId: user.id,
      status: { in: ["WAITING", "MATCHED"] },
    },
  });

  const activeMatch = await prisma.matchPlayer.findFirst({
    where: {
      userId: user.id,
      match: {
        status: {
          in: ["READY_CHECK", "CONFIGURING", "WARMUP", "KNIFE", "LIVE"],
        },
      },
    },
    include: { match: true },
  });

  const stats = [
    { label: "Matches", value: totalMatches, className: "text-foreground" },
    { label: "Wins", value: user.wins, className: "text-green-400" },
    { label: "Losses", value: user.losses, className: "text-red-400" },
    { label: "Draws", value: user.draws, className: "text-yellow-400" },
    { label: "Win Rate", value: `${winRate}%`, className: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Active Match Banner */}
        {activeMatch && (
          <Link href={`/match/${activeMatch.matchId}`} className="block mb-8">
            <Card className="border-green-500/30 bg-green-500/10 hover:bg-green-500/15 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-0">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-green-400" />
                  </span>
                  <span className="font-semibold text-green-400">
                    Active Match &mdash; {activeMatch.match.status}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Click to view
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Profile Header */}
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start mb-10">
          <Avatar className="size-28">
            <AvatarImage
              src={user.avatarFull || user.avatar}
              alt={user.displayName}
            />
            <AvatarFallback className="text-2xl">
              {user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">
              {user.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Steam ID: {user.steamId}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Badge className="border-primary/30 bg-primary/10 text-primary text-base px-3 py-1 h-auto">
                {user.elo} ELO
              </Badge>
              <Separator orientation="vertical" className="h-6 hidden md:block" />
              <span className="text-muted-foreground font-medium">
                Rank #{rank + 1}
              </span>
            </div>
          </div>

          <div className="md:ml-auto">
            <Button
              size="lg"
              className="px-6 shadow-lg shadow-primary/25"
              render={<Link href="/queue" />}
            >
              {activeQueue ? "In Queue..." : "Find Match"}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-10">
          {stats.map((stat) => (
            <Card key={stat.label} size="sm">
              <CardContent className="text-center">
                <p className={`text-2xl font-bold ${stat.className}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="mb-8" />

        {/* Recent Matches */}
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Matches</h2>

          {recentMatches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No matches played yet</p>
                <Button
                  variant="link"
                  className="mt-2"
                  render={<Link href="/queue" />}
                >
                  Join the queue to play your first match
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((mp) => {
                const won =
                  (mp.team === "TEAM_A" &&
                    mp.match.scoreTeamA > mp.match.scoreTeamB) ||
                  (mp.team === "TEAM_B" &&
                    mp.match.scoreTeamB > mp.match.scoreTeamA);
                const lost =
                  (mp.team === "TEAM_A" &&
                    mp.match.scoreTeamA < mp.match.scoreTeamB) ||
                  (mp.team === "TEAM_B" &&
                    mp.match.scoreTeamB < mp.match.scoreTeamA);

                const resultLabel =
                  mp.match.status === "FINISHED"
                    ? won
                      ? "WIN"
                      : lost
                        ? "LOSS"
                        : "DRAW"
                    : mp.match.status;

                const resultBorder = won
                  ? "ring-green-500/30 bg-green-500/5"
                  : lost
                    ? "ring-red-500/30 bg-red-500/5"
                    : "";

                const resultColor = won
                  ? "text-green-400"
                  : lost
                    ? "text-red-400"
                    : "text-yellow-400";

                return (
                  <Link
                    key={mp.id}
                    href={`/match/${mp.matchId}`}
                    className="block"
                  >
                    <Card
                      size="sm"
                      className={`hover:bg-muted/50 transition-colors cursor-pointer ${resultBorder}`}
                    >
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="secondary"
                            className={`font-bold ${resultColor}`}
                          >
                            {resultLabel}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            {mp.match.map}
                          </span>
                          <span className="font-medium">
                            {mp.match.scoreTeamA} &ndash; {mp.match.scoreTeamB}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {mp.kills}/{mp.deaths}/{mp.assists}
                          </span>
                          {mp.eloChange !== 0 && (
                            <Badge
                              variant="outline"
                              className={
                                mp.eloChange > 0
                                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                                  : "border-red-500/30 bg-red-500/10 text-red-400"
                              }
                            >
                              {mp.eloChange > 0 ? "+" : ""}
                              {mp.eloChange}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {mp.match.createdAt
                              ? new Date(
                                  mp.match.createdAt
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
