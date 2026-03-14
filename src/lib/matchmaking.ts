import prisma from "@/lib/prisma";
import { QueueType, MatchStatus, MatchTeam } from "@prisma/client";
import { COMPETITIVE_MAPS, DEFAULT_MATCH_MAP } from "@/lib/maps";
import { TEAM_SIZE } from "@/lib/teams";

// Can be set to 2 for dev/testing, 10 for production
const PLAYERS_PER_MATCH = parseInt(process.env.MATCH_THRESHOLD ?? "10", 10);
const READY_CHECK_TIMEOUT_SECONDS = 30;

interface QueuedPlayer {
  id: string;
  queueEntryId: string;
  steamId: string;
  displayName: string;
  avatar: string;
  elo: number;
}

interface QueuedTeamMember {
  id: string;
  steamId: string;
  displayName: string;
  avatar: string;
  elo: number;
}

interface QueuedTeam {
  queueEntryId: string;
  teamId: string;
  name: string;
  captainId: string;
  members: QueuedTeamMember[];
}

/**
 * HLTV 2.0 rating approximation
 */
export function calculateHltvRating(
  kills: number,
  deaths: number,
  assists: number,
  damage: number,
  rounds: number
): number {
  if (rounds === 0) return 0;
  const kpr = kills / rounds;
  const survivalRate = 1 - deaths / rounds;
  const rdm = damage / rounds / 100;
  const rating =
    kpr * 0.32 + survivalRate * 0.2 + rdm * 0.25 + (assists / rounds) * 0.15 + 0.8;
  return Math.round(rating * 100) / 100;
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

export async function checkTeamQueue(region: string): Promise<[QueuedTeam, QueuedTeam] | null> {
  const entries = await prisma.queueEntry.findMany({
    where: {
      type: QueueType.TEAM,
      status: "WAITING",
      region,
      teamId: { not: null },
    },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: true,
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
    take: 2,
  });

  if (entries.length < 2) return null;

  const teams = entries
    .filter((entry) => entry.team && entry.team.members.length === TEAM_SIZE)
    .map((entry) => ({
      queueEntryId: entry.id,
      teamId: entry.team!.id,
      name: entry.team!.name,
      captainId: entry.team!.captainId,
      members: entry.team!.members.map((member) => ({
        id: member.user.id,
        steamId: member.user.steamId,
        displayName: member.user.displayName,
        avatar: member.user.avatar,
        elo: member.user.elo,
      })),
    }));

  if (teams.length < 2) return null;

  return [teams[0], teams[1]];
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
      map: DEFAULT_MATCH_MAP,
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

export async function createTeamMatch(
  teamA: QueuedTeam,
  teamB: QueuedTeam,
  region: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + READY_CHECK_TIMEOUT_SECONDS * 1000);
  const allPlayers = [...teamA.members, ...teamB.members];

  const match = await prisma.match.create({
    data: {
      status: MatchStatus.READY_CHECK,
      region,
      map: DEFAULT_MATCH_MAP,
      players: {
        create: [
          ...teamA.members.map((player) => ({
            userId: player.id,
            team: MatchTeam.TEAM_A,
            isCaptain: player.id === teamA.captainId,
          })),
          ...teamB.members.map((player) => ({
            userId: player.id,
            team: MatchTeam.TEAM_B,
            isCaptain: player.id === teamB.captainId,
          })),
        ],
      },
      readyChecks: {
        create: allPlayers.map((player) => ({
          userId: player.id,
          status: "PENDING",
          expiresAt,
        })),
      },
    },
  });

  await prisma.queueEntry.updateMany({
    where: {
      id: { in: [teamA.queueEntryId, teamB.queueEntryId] },
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
    const selectedMap = await finalizeMatchMap(matchId);

    // Fetch all match players sorted by ELO descending to assign captains
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { matchId },
      include: { user: { select: { id: true, elo: true } } },
    });
    const sortedByElo = [...matchPlayers].sort(
      (a, b) => b.user.elo - a.user.elo
    );
    const captainA = sortedByElo[0];
    const captainB = sortedByElo[1];

    // Move match to DRAFT state; captains seed their own arrays
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.DRAFT,
        map: selectedMap,
        draftPick: 0,
        draftTeamA: JSON.stringify([captainA.user.id]),
        draftTeamB: JSON.stringify([captainB.user.id]),
      },
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

export function resolveWinningMap(
  votes: Array<{ map: string; userId: string }>
): string {
  const counts = new Map<string, number>();

  for (const map of COMPETITIVE_MAPS) {
    counts.set(map, 0);
  }

  for (const vote of votes) {
    counts.set(vote.map, (counts.get(vote.map) ?? 0) + 1);
  }

  let winner = DEFAULT_MATCH_MAP;
  let highestCount = -1;

  for (const map of COMPETITIVE_MAPS) {
    const count = counts.get(map) ?? 0;
    if (count > highestCount) {
      highestCount = count;
      winner = map;
    }
  }

  return winner;
}

export async function finalizeMatchMap(matchId: string): Promise<string> {
  const votes = await prisma.mapVote.findMany({
    where: { matchId },
    select: { map: true, userId: true },
  });

  return resolveWinningMap(votes);
}
