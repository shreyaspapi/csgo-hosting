import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/leaderboard - Get top players by ELO
 */
export async function GET(req: NextRequest) {
  const limit = parseInt(
    req.nextUrl.searchParams.get("limit") || "50"
  );
  const offset = parseInt(
    req.nextUrl.searchParams.get("offset") || "0"
  );

  const players = await prisma.user.findMany({
    select: {
      id: true,
      steamId: true,
      displayName: true,
      avatar: true,
      elo: true,
      wins: true,
      losses: true,
      draws: true,
    },
    orderBy: { elo: "desc" },
    take: Math.min(limit, 100),
    skip: offset,
  });

  const total = await prisma.user.count();

  return NextResponse.json({
    players: players.map((p, i) => ({
      ...p,
      rank: offset + i + 1,
      totalMatches: p.wins + p.losses + p.draws,
      winRate:
        p.wins + p.losses > 0
          ? Math.round((p.wins / (p.wins + p.losses)) * 100)
          : 0,
    })),
    total,
  });
}
