import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMatchTeamNames } from "@/lib/match-teams";

/**
 * GET /api/get5/match-config/[matchId]
 * Returns the get5 match configuration JSON.
 * Called by the game server when loading a match via get5_loadmatch_url.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  // Verify authorization
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.GET5_WEBHOOK_SECRET}`;
  if (!process.env.GET5_WEBHOOK_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      queueEntries: {
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
      },
      players: {
        include: {
          user: {
            select: {
              steamId: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json(
      { error: "Match not found" },
      { status: 404 }
    );
  }

  const teamA = match.players.filter((p) => p.team === "TEAM_A");
  const teamB = match.players.filter((p) => p.team === "TEAM_B");
  const { teamAName, teamBName } = getMatchTeamNames(match.queueEntries);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://fluidrush.com";

  // Build get5 match config
  const config = {
    matchid: match.id,
    num_maps: 1,
    maplist: [match.map],
    skip_veto: true,
    side_type: "knife",
    players_per_team: 5,
    min_players_to_ready: 1,
    team1: {
      name: teamAName,
      players: Object.fromEntries(
        teamA.map((p) => [p.user.steamId, p.user.displayName])
      ),
    },
    team2: {
      name: teamBName,
      players: Object.fromEntries(
        teamB.map((p) => [p.user.steamId, p.user.displayName])
      ),
    },
    cvars: {
      get5_remote_log_url: `${appUrl}/api/get5/webhook`,
      get5_remote_log_header_key: "Authorization",
      get5_remote_log_header_value: `Bearer ${process.env.GET5_WEBHOOK_SECRET}`,
    },
  };

  return NextResponse.json(config);
}
