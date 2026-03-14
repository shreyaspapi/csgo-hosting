import prisma from "@/lib/prisma";
import { QueueType, MatchStatus, MatchTeam } from "@prisma/client";

const PLAYERS_PER_MATCH = 10;
const READY_CHECK_TIMEOUT_SECONDS = 30;

interface QueuedPlayer {
  id: string;
  queueEntryId: string;
  steamId: string;
  displayName: string;
  avatar: string;
  elo: number;
}

/**
 * ELO calculation helper
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  kFactor: number = 32
): { winnerGain: number; loserLoss: number } {
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser =
    1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  const winnerGain = Math.round(kFactor * (1 - expectedWinner));
  const loserLoss = Math.round(kFactor * (0 - expectedLoser));

  return { winnerGain, loserLoss: Math.abs(loserLoss) };
}

/**
 * Check if there are enough solo players in queue to create a match
 */
export async function checkSoloQueue(region: string): Promise<QueuedPlayer[] | null> {
  const entries = await prisma.queueEntry.findMany({
    where: {
      type: QueueType.SOLO,
      status: "WAITING",
      region,
      userId: { not: null },
    },
    include: {
      user: true,
    },
    orderBy: { joinedAt: "asc" },
    take: PLAYERS_PER_MATCH,
  });

  if (entries.length < PLAYERS_PER_MATCH) return null;

  return entries.map((e) => ({
    id: e.user!.id,
    queueEntryId: e.id,
    steamId: e.user!.steamId,
    displayName: e.user!.displayName,
    avatar: e.user!.avatar,
    elo: e.user!.elo,
  }));
}

/**
 * Balance teams based on ELO
 * Uses a greedy algorithm: sort by ELO, alternate assignment
 */
export function balanceTeams(
  players: QueuedPlayer[]
): { teamA: QueuedPlayer[]; teamB: QueuedPlayer[] } {
  // Sort by ELO descending
  const sorted = [...players].sort((a, b) => b.elo - a.elo);

  const teamA: QueuedPlayer[] = [];
  const teamB: QueuedPlayer[] = [];

  // Snake draft: 1-2-2-2-1 pattern for fair distribution
  for (let i = 0; i < sorted.length; i++) {
    const round = Math.floor(i / 2);
    if (round % 2 === 0) {
      if (i % 2 === 0) teamA.push(sorted[i]);
      else teamB.push(sorted[i]);
    } else {
      if (i % 2 === 0) teamB.push(sorted[i]);
      else teamA.push(sorted[i]);
    }
  }

  return { teamA, teamB };
}

/**
 * Create a match from queued players
 */
export async function createMatch(
  players: QueuedPlayer[],
  region: string
): Promise<string> {
  const { teamA, teamB } = balanceTeams(players);

  const expiresAt = new Date(
    Date.now() + READY_CHECK_TIMEOUT_SECONDS * 1000
  );

  // Create the match
  const match = await prisma.match.create({
    data: {
      status: MatchStatus.READY_CHECK,
      region,
      map: "de_dust2", // Default map, can be changed later with map voting
      players: {
        create: [
          ...teamA.map((p, i) => ({
            userId: p.id,
            team: MatchTeam.TEAM_A,
            isCaptain: i === 0, // Highest ELO in team is captain
          })),
          ...teamB.map((p, i) => ({
            userId: p.id,
            team: MatchTeam.TEAM_B,
            isCaptain: i === 0,
          })),
        ],
      },
      readyChecks: {
        create: players.map((p) => ({
          userId: p.id,
          status: "PENDING",
          expiresAt,
        })),
      },
    },
  });

  // Update queue entries to MATCHED status
  await prisma.queueEntry.updateMany({
    where: {
      id: { in: players.map((p) => p.queueEntryId) },
    },
    data: {
      status: "MATCHED",
      matchId: match.id,
    },
  });

  return match.id;
}

/**
 * Handle a player accepting the ready check
 */
export async function acceptReadyCheck(
  matchId: string,
  userId: string
): Promise<{ allReady: boolean; acceptedCount: number; totalCount: number }> {
  // Update this player's ready check
  await prisma.readyCheck.update({
    where: {
      matchId_userId: { matchId, userId },
    },
    data: { status: "ACCEPTED" },
  });

  // Check if all players are ready
  const readyChecks = await prisma.readyCheck.findMany({
    where: { matchId },
  });

  const acceptedCount = readyChecks.filter(
    (rc) => rc.status === "ACCEPTED"
  ).length;
  const totalCount = readyChecks.length;
  const allReady = acceptedCount === totalCount;

  if (allReady) {
    // Move match to CONFIGURING state
    await prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.CONFIGURING },
    });

    // Update all queue entries to IN_MATCH
    await prisma.queueEntry.updateMany({
      where: { matchId },
      data: { status: "IN_MATCH" },
    });
  }

  return { allReady, acceptedCount, totalCount };
}

/**
 * Handle a player declining the ready check or timing out
 */
export async function declineReadyCheck(
  matchId: string,
  userId: string
): Promise<void> {
  // Update this player's ready check
  await prisma.readyCheck.update({
    where: {
      matchId_userId: { matchId, userId },
    },
    data: { status: "DECLINED" },
  });

  // Cancel the match
  await prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.CANCELLED },
  });

  // Re-queue all players who accepted (except the one who declined)
  const acceptedChecks = await prisma.readyCheck.findMany({
    where: {
      matchId,
      status: "ACCEPTED",
    },
  });

  // Reset accepted players back to WAITING in queue
  for (const rc of acceptedChecks) {
    await prisma.queueEntry.updateMany({
      where: { userId: rc.userId, matchId },
      data: { status: "WAITING", matchId: null },
    });
  }

  // Remove the declined player from queue
  await prisma.queueEntry.deleteMany({
    where: { userId, matchId },
  });

  // Remove any other pending players from queue and let them re-join
  await prisma.queueEntry.deleteMany({
    where: {
      matchId,
      status: "MATCHED",
    },
  });
}

/**
 * Handle expired ready checks
 */
export async function handleExpiredReadyChecks(): Promise<string[]> {
  const expiredMatches = await prisma.match.findMany({
    where: {
      status: MatchStatus.READY_CHECK,
      readyChecks: {
        some: {
          status: "PENDING",
          expiresAt: { lt: new Date() },
        },
      },
    },
    include: {
      readyChecks: true,
    },
  });

  const cancelledMatchIds: string[] = [];

  for (const match of expiredMatches) {
    // Find users who didn't accept
    const pendingUsers = match.readyChecks
      .filter((rc) => rc.status === "PENDING")
      .map((rc) => rc.userId);

    // Expire their ready checks
    await prisma.readyCheck.updateMany({
      where: {
        matchId: match.id,
        status: "PENDING",
      },
      data: { status: "EXPIRED" },
    });

    // Cancel the match
    await prisma.match.update({
      where: { id: match.id },
      data: { status: MatchStatus.CANCELLED },
    });

    // Re-queue accepted players
    const acceptedUsers = match.readyChecks
      .filter((rc) => rc.status === "ACCEPTED")
      .map((rc) => rc.userId);

    for (const uid of acceptedUsers) {
      await prisma.queueEntry.updateMany({
        where: { userId: uid, matchId: match.id },
        data: { status: "WAITING", matchId: null },
      });
    }

    // Remove non-accepting players from queue
    for (const uid of pendingUsers) {
      await prisma.queueEntry.deleteMany({
        where: { userId: uid, matchId: match.id },
      });
    }

    cancelledMatchIds.push(match.id);
  }

  return cancelledMatchIds;
}

/**
 * Get current queue stats
 */
export async function getQueueStats(region?: string) {
  const where = region ? { region, status: "WAITING" as const } : { status: "WAITING" as const };

  const [soloCount, teamCount, matchesToday] = await Promise.all([
    prisma.queueEntry.count({
      where: { ...where, type: QueueType.SOLO },
    }),
    prisma.queueEntry.count({
      where: { ...where, type: QueueType.TEAM },
    }),
    prisma.match.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        status: { not: MatchStatus.CANCELLED },
      },
    }),
  ]);

  return { soloCount, teamCount, matchesToday };
}
