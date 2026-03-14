import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MatchStatus, Prisma } from "@prisma/client";
import { calculateEloChange } from "@/lib/matchmaking";
import { deallocateServer } from "@/lib/azure-server";

interface Get5Event {
  matchid: string;
  event: string;
  params?: Record<string, unknown>;
}

interface Get5RoundEndEvent extends Get5Event {
  params: { team1_score: number; team2_score: number };
}

interface Get5PlayerDeathEvent extends Get5Event {
  params: {
    attacker?: { steamid: string };
    victim?: { steamid: string };
    assist?: { steamid: string };
  };
}

/**
 * POST /api/get5/webhook
 * Receives events from get5 plugin on the game server.
 *
 * get5 event types:
 * - game_state_changed: Match state transitions
 * - going_live: Match is going live
 * - round_end: Round ended
 * - map_result: Map ended with final score
 * - series_end: Series ended
 * - player_death: Player died
 * - player_say: Player chat
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // Verify authorization
    const authHeader = req.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.GET5_WEBHOOK_SECRET}`;
    if (authHeader !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matchId = event.matchid;
    if (!matchId) {
      return NextResponse.json(
        { error: "No matchid in event" },
        { status: 400 }
      );
    }

    const eventType = event.event;

    switch (eventType) {
      case "going_live":
        await handleGoingLive(matchId);
        break;

      case "round_end":
        await handleRoundEnd(matchId, event);
        break;

      case "map_result":
        await handleMapResult(matchId, event);
        break;

      case "series_end":
        await handleSeriesEnd(matchId, event);
        break;

      case "player_death":
        await handlePlayerDeath(matchId, event);
        break;

      default:
        // Log unknown events for debugging
        console.log(`get5 event: ${eventType}`, event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("get5 webhook error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

async function handleGoingLive(matchId: string) {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.LIVE,
      startedAt: new Date(),
    },
  });
}

async function handleRoundEnd(matchId: string, event: Get5RoundEndEvent) {
  // Update scores
  const team1Score = event.params?.team1_score ?? 0;
  const team2Score = event.params?.team2_score ?? 0;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreTeamA: team1Score,
      scoreTeamB: team2Score,
    },
  });
}

async function handlePlayerDeath(matchId: string, event: Get5PlayerDeathEvent) {
  const attackerSteamId = event.params?.attacker?.steamid;
  const victimSteamId = event.params?.victim?.steamid;
  const assisterSteamId = event.params?.assist?.steamid;

  // Update killer stats
  if (attackerSteamId) {
    const attacker = await prisma.user.findUnique({
      where: { steamId: attackerSteamId },
    });
    if (attacker) {
      await prisma.matchPlayer.updateMany({
        where: { matchId, userId: attacker.id },
        data: { kills: { increment: 1 } },
      });
    }
  }

  // Update victim stats
  if (victimSteamId) {
    const victim = await prisma.user.findUnique({
      where: { steamId: victimSteamId },
    });
    if (victim) {
      await prisma.matchPlayer.updateMany({
        where: { matchId, userId: victim.id },
        data: { deaths: { increment: 1 } },
      });
    }
  }

  // Update assist stats
  if (assisterSteamId) {
    const assister = await prisma.user.findUnique({
      where: { steamId: assisterSteamId },
    });
    if (assister) {
      await prisma.matchPlayer.updateMany({
        where: { matchId, userId: assister.id },
        data: { assists: { increment: 1 } },
      });
    }
  }
}

async function handleMapResult(matchId: string, event: Get5RoundEndEvent) {
  const team1Score = event.params?.team1_score ?? 0;
  const team2Score = event.params?.team2_score ?? 0;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreTeamA: team1Score,
      scoreTeamB: team2Score,
    },
  });
}

async function handleSeriesEnd(matchId: string, _event: Get5Event) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: { user: true },
      },
    },
  });

  if (!match) return;

  // Determine winner
  const teamAWon = match.scoreTeamA > match.scoreTeamB;
  const isDraw = match.scoreTeamA === match.scoreTeamB;

  const teamAPlayers = match.players.filter((p) => p.team === "TEAM_A");
  const teamBPlayers = match.players.filter((p) => p.team === "TEAM_B");

  const avgEloA =
    teamAPlayers.reduce((sum, p) => sum + p.user.elo, 0) /
    teamAPlayers.length;
  const avgEloB =
    teamBPlayers.reduce((sum, p) => sum + p.user.elo, 0) /
    teamBPlayers.length;

  // Calculate ELO changes
  const { winnerGain, loserLoss } = calculateEloChange(
    teamAWon ? avgEloA : avgEloB,
    teamAWon ? avgEloB : avgEloA
  );

  // Update player ELOs and match stats
  for (const player of match.players) {
    let eloChange = 0;

    if (isDraw) {
      eloChange = 0;
    } else if (
      (player.team === "TEAM_A" && teamAWon) ||
      (player.team === "TEAM_B" && !teamAWon)
    ) {
      // Winner
      eloChange = winnerGain;
    } else {
      // Loser
      eloChange = -loserLoss;
    }

    // Update match player record
    await prisma.matchPlayer.update({
      where: {
        matchId_userId: { matchId, userId: player.userId },
      },
      data: { eloChange },
    });

    // Update user ELO and W/L record
    const updateData: Prisma.UserUpdateInput = {
      elo: { increment: eloChange },
    };

    if (isDraw) {
      updateData.draws = { increment: 1 };
    } else if (eloChange > 0) {
      updateData.wins = { increment: 1 };
    } else {
      updateData.losses = { increment: 1 };
    }

    await prisma.user.update({
      where: { id: player.userId },
      data: updateData,
    });
  }

  // Mark match as finished
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.FINISHED,
      finishedAt: new Date(),
    },
  });

  // Clean up queue entries
  await prisma.queueEntry.deleteMany({
    where: { matchId },
  });

  // Deallocate the server (fire and forget — don't block the response)
  if (match.serverId) {
    deallocateServer(match.serverId).catch(console.error);
  }
}
