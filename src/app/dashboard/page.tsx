import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  // Fetch user with stats
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/");

  // Fetch recent matches
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

  // Fetch rank
  const rank = await prisma.user.count({
    where: { elo: { gt: user.elo } },
  });

  const totalMatches = user.wins + user.losses + user.draws;
  const winRate =
    user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100)
      : 0;

  // Check if currently in queue or match
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

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Active Match Banner */}
        {activeMatch && (
          <Link
            href={`/match/${activeMatch.matchId}`}
            className="block mb-8 bg-green-500/10 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="font-semibold text-green-400">
                  Active Match - {activeMatch.match.status}
                </span>
              </div>
              <span className="text-sm text-gray-400">Click to view</span>
            </div>
          </Link>
        )}

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10">
          <Image
            src={user.avatarFull || user.avatar}
            alt={user.displayName}
            width={120}
            height={120}
            className="rounded-2xl"
          />
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold">{user.displayName}</h1>
            <p className="text-gray-400 text-sm mt-1">
              Steam ID: {user.steamId}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-orange-400 font-bold text-2xl">
                {user.elo} ELO
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-300">
                Rank #{rank + 1}
              </span>
            </div>
          </div>
          <div className="md:ml-auto">
            <Link
              href="/queue"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25"
            >
              {activeQueue ? "In Queue..." : "Find Match"}
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            {
              label: "Matches",
              value: totalMatches,
              color: "text-white",
            },
            {
              label: "Wins",
              value: user.wins,
              color: "text-green-400",
            },
            {
              label: "Losses",
              value: user.losses,
              color: "text-red-400",
            },
            {
              label: "Draws",
              value: user.draws,
              color: "text-yellow-400",
            },
            {
              label: "Win Rate",
              value: `${winRate}%`,
              color: "text-orange-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Matches */}
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">No matches played yet</p>
              <Link
                href="/queue"
                className="inline-block mt-4 text-orange-400 hover:text-orange-300 text-sm font-medium"
              >
                Join the queue to play your first match
              </Link>
            </div>
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

                const resultColor = won
                  ? "border-green-500/30 bg-green-500/5"
                  : lost
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-gray-800 bg-gray-900";

                return (
                  <Link
                    key={mp.id}
                    href={`/match/${mp.matchId}`}
                    className={`flex items-center justify-between p-4 rounded-lg border hover:bg-gray-800/50 transition-colors ${resultColor}`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm font-bold ${
                          won
                            ? "text-green-400"
                            : lost
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {mp.match.status === "FINISHED"
                          ? won
                            ? "WIN"
                            : lost
                            ? "LOSS"
                            : "DRAW"
                          : mp.match.status}
                      </span>
                      <span className="text-gray-400">{mp.match.map}</span>
                      <span className="text-white font-medium">
                        {mp.match.scoreTeamA} - {mp.match.scoreTeamB}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        {mp.kills}/{mp.deaths}/{mp.assists}
                      </span>
                      {mp.eloChange !== 0 && (
                        <span
                          className={`font-medium ${
                            mp.eloChange > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {mp.eloChange > 0 ? "+" : ""}
                          {mp.eloChange}
                        </span>
                      )}
                      <span className="text-gray-600 text-xs">
                        {mp.match.createdAt
                          ? new Date(
                              mp.match.createdAt
                            ).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
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
