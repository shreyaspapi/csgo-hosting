import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";

/**
 * GET /api/matches
 * Returns paginated match history for the authenticated user.
 * Query params: status, region, limit (default 20), offset (default 0)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? undefined;
  const region = sp.get("region") ?? undefined;
  const limit = Math.min(parseInt(sp.get("limit") ?? "20", 10), 100);
  const offset = parseInt(sp.get("offset") ?? "0", 10);

  // Build the match filter
  const matchWhere: { status?: MatchStatus; region?: string } = {};
  if (status && status !== "All" && Object.values(MatchStatus).includes(status as MatchStatus)) {
    matchWhere.status = status as MatchStatus;
  }
  if (region) {
    matchWhere.region = region;
  }

  const [matchPlayers, total] = await Promise.all([
    prisma.matchPlayer.findMany({
      where: {
        userId: session.user.id,
        match: matchWhere,
      },
      include: {
        match: {
          select: {
            id: true,
            status: true,
            map: true,
            region: true,
            scoreTeamA: true,
            scoreTeamB: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
      orderBy: {
        match: { createdAt: "desc" },
      },
      take: limit,
      skip: offset,
    }),
    prisma.matchPlayer.count({
      where: {
        userId: session.user.id,
        match: matchWhere as { status?: MatchStatus; region?: string },
      },
    }),
  ]);

  const matches = matchPlayers.map((mp) => {
    const m = mp.match;
    // Duration in seconds
    const duration =
      m.startedAt && m.finishedAt
        ? Math.round((new Date(m.finishedAt).getTime() - new Date(m.startedAt).getTime()) / 1000)
        : null;

    // Determine result from perspective of this user
    let result: "win" | "loss" | "draw" | "unknown" = "unknown";
    if (m.status === MatchStatus.FINISHED) {
      const isTeamA = mp.team === "TEAM_A";
      if (m.scoreTeamA === m.scoreTeamB) {
        result = "draw";
      } else if (
        (isTeamA && m.scoreTeamA > m.scoreTeamB) ||
        (!isTeamA && m.scoreTeamB > m.scoreTeamA)
      ) {
        result = "win";
      } else {
        result = "loss";
      }
    }

    return {
      matchId: m.id,
      status: m.status,
      map: m.map,
      region: m.region,
      scoreTeamA: m.scoreTeamA,
      scoreTeamB: m.scoreTeamB,
      team: mp.team,
      kills: mp.kills,
      deaths: mp.deaths,
      assists: mp.assists,
      eloChange: mp.eloChange,
      result,
      duration,
      createdAt: m.createdAt,
      finishedAt: m.finishedAt,
    };
  });

  return NextResponse.json({ matches, total, limit, offset });
}
