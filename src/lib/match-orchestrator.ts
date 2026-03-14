import prisma from "@/lib/prisma";
import { MatchStatus, ServerStatus } from "@prisma/client";
import { provisionServer } from "@/lib/azure-server";
import { configureMatchServer } from "@/lib/rcon";

/**
 * Match Orchestrator
 * Handles the flow after all players accept the ready check:
 * 1. Find or provision a server
 * 2. Configure the server for the match
 * 3. Update match status so players can connect
 */

export async function orchestrateMatch(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: {
          user: {
            select: { id: true, steamId: true, displayName: true },
          },
        },
      },
    },
  });

  if (!match || match.status !== "CONFIGURING") {
    console.error(`Match ${matchId} not in CONFIGURING state`);
    return;
  }

  const teamA = match.players.filter((p) => p.team === "TEAM_A");
  const teamB = match.players.filter((p) => p.team === "TEAM_B");

  try {
    // Step 1: Try to find an already-available server
    const server = await prisma.gameServer.findFirst({
      where: {
        status: ServerStatus.AVAILABLE,
        region: match.region,
        currentMatchId: null,
      },
    });

    if (server) {
      // Use the existing available server
      await prisma.gameServer.update({
        where: { id: server.id },
        data: { currentMatchId: matchId, status: ServerStatus.IN_USE },
      });

      await prisma.match.update({
        where: { id: matchId },
        data: {
          serverId: server.id,
          serverIp: server.ip,
          serverPort: server.port,
          connectString: `steam://connect/${server.ip}:${server.port}`,
        },
      });

      // Configure the match via RCON
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://fluidrush.com";

      await configureMatchServer(
        {
          host: server.ip!,
          port: server.port,
          password: server.rconPassword!,
        },
        {
          matchId,
          map: match.map,
          teamAName: "Team A",
          teamBName: "Team B",
          teamASteamIds: teamA.map((p) => p.user.steamId),
          teamBSteamIds: teamB.map((p) => p.user.steamId),
          webhookUrl: `${appUrl}/api/get5/webhook`,
        }
      );

      // Match is ready
      await prisma.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.WARMUP },
      });
    } else {
      // Step 2: Provision a new server dynamically
      console.log(`Provisioning new server for match ${matchId}`);

      const { serverId, ip, port } = await provisionServer(
        matchId,
        match.region
      );

      // Update match with server info
      await prisma.match.update({
        where: { id: matchId },
        data: {
          serverId,
          serverIp: ip,
          serverPort: port,
          connectString: `steam://connect/${ip}:${port}`,
        },
      });

      // The server startup script will call /api/servers/ready
      // which will configure the match and update status to WARMUP
      // For now, match stays in CONFIGURING until the server reports ready
    }
  } catch (error) {
    console.error(`Failed to orchestrate match ${matchId}:`, error);

    // Don't cancel the match immediately - allow retry
    // Log the error for admin visibility
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.CONFIGURING, // Keep in configuring state
      },
    });
  }
}
