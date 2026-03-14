import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ServerStatus, MatchStatus } from "@prisma/client";
import { configureMatchServer } from "@/lib/rcon";
import { getMatchTeamNames } from "@/lib/match-teams";

/**
 * POST /api/servers/ready
 * Called by the VM startup script when CS:GO server is ready
 */
export async function POST(req: NextRequest) {
  try {
    const { matchId, rconPassword } = await req.json();

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId required" },
        { status: 400 }
      );
    }

    // Find the server for this match
    const server = await prisma.gameServer.findFirst({
      where: { currentMatchId: matchId },
    });

    if (!server) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    // Update server status to AVAILABLE
    await prisma.gameServer.update({
      where: { id: server.id },
      data: {
        status: ServerStatus.AVAILABLE,
        rconPassword: rconPassword || server.rconPassword,
      },
    });

    // Get match details to configure the server
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
                id: true,
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

    // Configure the match on the server using get5
    try {
      await configureMatchServer(
        {
          host: server.ip!,
          port: server.port,
          password: server.rconPassword!,
        },
        {
          matchId: match.id,
          map: match.map,
          teamAName,
          teamBName,
          teamASteamIds: teamA.map((p) => p.user.steamId),
          teamBSteamIds: teamB.map((p) => p.user.steamId),
          webhookUrl: `${appUrl}/api/get5/webhook`,
        }
      );

      // Update match with server info
      const connectString = `steam://connect/${server.ip}:${server.port}`;
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.WARMUP,
          serverId: server.id,
          serverIp: server.ip,
          serverPort: server.port,
          connectString,
        },
      });

      // Mark server as in use
      await prisma.gameServer.update({
        where: { id: server.id },
        data: { status: ServerStatus.IN_USE },
      });
    } catch (rconError) {
      console.error("RCON configuration failed:", rconError);
      // Still mark server as available - manual config may be needed
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.WARMUP,
          serverId: server.id,
          serverIp: server.ip,
          serverPort: server.port,
          connectString: `steam://connect/${server.ip}:${server.port}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server ready error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
