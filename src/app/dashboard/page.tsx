import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import prisma from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const isAdmin = isAdminSession(session);

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/");

  const [recentMatches, rankAbove, activeQueue, activeMatch] = await Promise.all([
    prisma.matchPlayer.findMany({
      where: { userId: user.id },
      include: {
        match: {
          select: {
            id: true, status: true, map: true,
            scoreTeamA: true, scoreTeamB: true,
            createdAt: true, finishedAt: true,
          },
        },
      },
      orderBy: { match: { createdAt: "desc" } },
      take: 10,
    }),
    prisma.user.count({ where: { elo: { gt: user.elo } } }),
    prisma.queueEntry.findFirst({
      where: { userId: user.id, status: { in: ["WAITING", "MATCHED"] } },
    }),
    prisma.matchPlayer.findFirst({
      where: {
        userId: user.id,
        match: { status: { in: ["READY_CHECK", "CONFIGURING", "WARMUP", "KNIFE", "LIVE"] } },
      },
      include: { match: { select: { id: true, status: true } } },
    }),
  ]);

  const totalMatches = user.wins + user.losses + user.draws;
  const winRate = user.wins + user.losses > 0
    ? Math.round((user.wins / (user.wins + user.losses)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-12">

        {/* Active match banner */}
        {activeMatch && (
          <Link href={`/match/${activeMatch.matchId}`}>
            <Card className="mb-8 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-green-400" />
                  </span>
                  <span className="font-semibold text-green-400">
                    Active Match — {activeMatch.match.status}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">Click to view →</span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Profile */}
        <div className="mb-10 flex flex-col items-center gap-6 md:flex-row md:items-start">
          <Avatar className="size-24 rounded-2xl">
            <AvatarImage src={user.avatarFull ?? user.avatar} alt={user.displayName} />
            <AvatarFallback className="rounded-2xl text-2xl">{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold">{user.displayName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.steamId}</p>
            <div className="mt-3 flex items-center justify-center gap-3 md:justify-start">
              <span className="text-2xl font-bold text-primary">{user.elo} ELO</span>
              <Separator orientation="vertical" className="h-5" />
              <span className="text-muted-foreground">Rank #{rankAbove + 1}</span>
            </div>
          </div>

          <div className="md:ml-auto">
            <div className="flex gap-3">
              {isAdmin && (
                <Button variant="outline" size="lg" render={<Link href="/admin" />}>
                  Admin
                </Button>
              )}
              <Button
                size="lg"
                className="shadow-lg shadow-primary/20"
                render={<Link href="/queue" />}
              >
                {activeQueue ? "In Queue..." : "Find Match"}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Matches", value: totalMatches, cls: "text-foreground" },
            { label: "Wins", value: user.wins, cls: "text-green-400" },
            { label: "Losses", value: user.losses, cls: "text-destructive" },
            { label: "Draws", value: user.draws, cls: "text-yellow-400" },
            { label: "Win Rate", value: `${winRate}%`, cls: "text-primary" },
          ].map((s) => (
            <Card key={s.label} size="sm">
              <CardContent className="pt-4 text-center">
                <p className={cn("text-2xl font-bold", s.cls)}>{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent matches */}
        <div>
          <h2 className="mb-4 text-xl font-bold">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No matches played yet</p>
                <Button variant="link" className="mt-2" render={<Link href="/queue" />}>
                  Join the queue to play your first match
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((mp) => {
                const won =
                  (mp.team === "TEAM_A" && mp.match.scoreTeamA > mp.match.scoreTeamB) ||
                  (mp.team === "TEAM_B" && mp.match.scoreTeamB > mp.match.scoreTeamA);
                const lost =
                  (mp.team === "TEAM_A" && mp.match.scoreTeamA < mp.match.scoreTeamB) ||
                  (mp.team === "TEAM_B" && mp.match.scoreTeamB < mp.match.scoreTeamA);
                const finished = mp.match.status === "FINISHED";

                return (
                  <Link key={mp.id} href={`/match/${mp.matchId}`}>
                    <Card
                      size="sm"
                      className={cn(
                        "transition-colors hover:ring-primary/20 cursor-pointer",
                        won && "border-green-500/30 bg-green-500/5",
                        lost && "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-14 justify-center text-xs",
                              !finished ? "border-muted" :
                              won ? "border-green-500/30 text-green-400" :
                              lost ? "border-destructive/30 text-destructive" :
                              "border-yellow-500/30 text-yellow-400"
                            )}
                          >
                            {!finished ? mp.match.status.slice(0, 4) : won ? "WIN" : lost ? "LOSS" : "DRAW"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{mp.match.map}</span>
                          <span className="font-medium">{mp.match.scoreTeamA} — {mp.match.scoreTeamB}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{mp.kills}/{mp.deaths}/{mp.assists}</span>
                          {mp.eloChange !== 0 && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                mp.eloChange > 0 ? "border-green-500/30 text-green-400" : "border-destructive/30 text-destructive"
                              )}
                            >
                              {mp.eloChange > 0 ? "+" : ""}{mp.eloChange}
                            </Badge>
                          )}
                          <span className="text-xs">{new Date(mp.match.createdAt).toLocaleDateString()}</span>
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
