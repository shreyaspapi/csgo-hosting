import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { QueueType } from "@prisma/client";
import { checkSoloQueue, checkTeamQueue, createMatch, createTeamMatch, getQueueStats } from "@/lib/matchmaking";
import { TEAM_SIZE } from "@/lib/teams";
import crypto from "crypto";

/**
 * GET /api/queue - Get current queue status
 */
export async function GET(req: NextRequest) {
  const region =
    req.nextUrl.searchParams.get("region") || "centralindia";

  const stats = await getQueueStats(region);
  return NextResponse.json(stats);
}

/**
 * POST /api/queue - Join the queue
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isBanned: true, banReason: true },
  });

  if (currentUser?.isBanned) {
    return NextResponse.json(
      { error: currentUser.banReason || "You are banned from queueing" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { type = "SOLO", region = "centralindia", teamId, partyMemberIds } = body;

  // Validate partyMemberIds if provided (array of user IDs, max 3 others = 4-stack)
  const MAX_PARTY_SIZE = 4;
  if (partyMemberIds && !Array.isArray(partyMemberIds)) {
    return NextResponse.json({ error: "partyMemberIds must be an array" }, { status: 400 });
  }
  if (partyMemberIds && partyMemberIds.length > MAX_PARTY_SIZE - 1) {
    return NextResponse.json(
      { error: `Party can have at most ${MAX_PARTY_SIZE} members (including you)` },
      { status: 400 }
    );
  }

  // Check if user is already in an active match
  const activeMatch = await prisma.matchPlayer.findFirst({
    where: {
      userId: session.user.id,
      match: {
        status: {
          in: ["READY_CHECK", "CONFIGURING", "WARMUP", "KNIFE", "LIVE"],
        },
      },
    },
  });

  if (activeMatch) {
    return NextResponse.json(
      { error: "Already in an active match" },
      { status: 400 }
    );
  }

  let matchId: string | null = null;
  let entryId: string | null = null;

  if (type === "TEAM") {
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        queueEntry: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.captainId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the captain can queue the team" },
        { status: 403 }
      );
    }

    if (team.members.length !== TEAM_SIZE) {
      return NextResponse.json(
        { error: `Your team needs exactly ${TEAM_SIZE} players to queue` },
        { status: 400 }
      );
    }

    const memberIds = team.members.map((member) => member.userId);
    const bannedMember = team.members.find((member) => member.user.isBanned);
    if (bannedMember) {
      return NextResponse.json(
        {
          error: `${bannedMember.user.displayName} is banned and cannot queue`,
        },
        { status: 403 }
      );
    }

    const activeMemberMatches = await prisma.matchPlayer.count({
      where: {
        userId: { in: memberIds },
        match: {
          status: {
            in: ["READY_CHECK", "CONFIGURING", "WARMUP", "KNIFE", "LIVE"],
          },
        },
      },
    });

    if (activeMemberMatches > 0) {
      return NextResponse.json(
        { error: "One or more team members are already in an active match" },
        { status: 400 }
      );
    }

    await prisma.queueEntry.deleteMany({
      where: {
        userId: { in: memberIds },
        status: { in: ["WAITING", "MATCHED"] },
      },
    });

    if (team.queueEntry?.status === "WAITING") {
      return NextResponse.json(
        { error: "This team is already in queue" },
        { status: 400 }
      );
    }

    const entry = await prisma.queueEntry.upsert({
      where: {
        teamId,
      },
      create: {
        teamId,
        type: QueueType.TEAM,
        region,
        status: "WAITING",
      },
      update: {
        region,
        status: "WAITING",
        matchId: null,
      },
    });

    entryId = entry.id;

    const teams = await checkTeamQueue(region);
    if (teams) {
      matchId = await createTeamMatch(teams[0], teams[1], region);
    }
  } else if (partyMemberIds && partyMemberIds.length > 0) {
    // ── Party queue (duo/trio/4-stack into solo pool) ──────────────
    const allMemberIds = [session.user.id, ...partyMemberIds];
    const partyId = crypto.randomUUID();

    // Validate all party members exist and are not banned
    const members = await prisma.user.findMany({
      where: { id: { in: allMemberIds } },
      select: { id: true, displayName: true, isBanned: true, banReason: true },
    });

    if (members.length !== allMemberIds.length) {
      return NextResponse.json(
        { error: "One or more party members not found" },
        { status: 404 }
      );
    }

    const banned = members.find((m) => m.isBanned);
    if (banned) {
      return NextResponse.json(
        { error: `${banned.displayName} is banned and cannot queue` },
        { status: 403 }
      );
    }

    // Check no party member is in an active match
    const activePartyMatches = await prisma.matchPlayer.count({
      where: {
        userId: { in: allMemberIds },
        match: {
          status: {
            in: ["READY_CHECK", "CONFIGURING", "WARMUP", "KNIFE", "LIVE"],
          },
        },
      },
    });

    if (activePartyMatches > 0) {
      return NextResponse.json(
        { error: "One or more party members are already in an active match" },
        { status: 400 }
      );
    }

    // Remove any stale queue entries for all party members
    await prisma.queueEntry.deleteMany({
      where: {
        userId: { in: allMemberIds },
        status: { in: ["WAITING", "MATCHED"] },
      },
    });

    // Create a queue entry for each party member with shared partyId
    const createdEntries = await Promise.all(
      allMemberIds.map((userId) =>
        prisma.queueEntry.create({
          data: {
            userId,
            type: QueueType.SOLO,
            region,
            status: "WAITING",
            partyId,
          },
        })
      )
    );

    // The entry for the requesting user
    entryId = createdEntries.find((e) => e.userId === session.user.id)?.id ?? createdEntries[0].id;

    // Check if match can be formed
    const players = await checkSoloQueue(region);
    if (players) {
      matchId = await createMatch(players, region);
    }
  } else {
    // ── True solo queue ───────────────────────────────────────────
    // Wrap solo queue join in a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Remove any stale queue entry first (handles DB unique constraint on userId)
      await tx.queueEntry.deleteMany({
        where: {
          userId: session.user.id,
          status: { in: ["WAITING", "MATCHED"] },
        },
      });

      // Check for active match inside transaction
      const activeMatchInTx = await tx.matchPlayer.findFirst({
        where: {
          userId: session.user.id,
          match: {
            status: {
              in: ["READY_CHECK", "CONFIGURING", "WARMUP", "KNIFE", "LIVE"],
            },
          },
        },
      });

      if (activeMatchInTx) {
        return { error: "Already in an active match" as const };
      }

      const entry = await tx.queueEntry.create({
        data: {
          userId: session.user.id,
          type: QueueType.SOLO,
          region,
          status: "WAITING",
        },
      });

      const players = await checkSoloQueue(region);
      let txMatchId: string | null = null;
      if (players) {
        txMatchId = await createMatch(players, region);
      }

      return { entryId: entry.id, matchId: txMatchId };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    entryId = result.entryId;
    matchId = result.matchId;
  }

  const stats = await getQueueStats(region);

  return NextResponse.json({
    queueEntryId: entryId,
    matchId,
    stats,
  });
}

/**
 * DELETE /api/queue - Leave the queue
 * If the user is in a party, the entire party is removed from queue.
 */
export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has a party queue entry — if so, remove the whole party
  const userEntry = await prisma.queueEntry.findFirst({
    where: {
      userId: session.user.id,
      status: "WAITING",
    },
  });

  if (userEntry?.partyId) {
    // Remove all party members from queue
    await prisma.queueEntry.deleteMany({
      where: {
        partyId: userEntry.partyId,
        status: "WAITING",
      },
    });
    return NextResponse.json({ success: true });
  }

  const deletedSolo = await prisma.queueEntry.deleteMany({
    where: {
      userId: session.user.id,
      status: "WAITING",
    },
  });

  if (deletedSolo.count === 0) {
    const teamMembership = await prisma.teamMember.findUnique({
      where: { userId: session.user.id },
      include: {
        team: {
          include: {
            queueEntry: true,
          },
        },
      },
    });

    if (teamMembership?.team?.captainId === session.user.id) {
      await prisma.queueEntry.deleteMany({
        where: {
          teamId: teamMembership.team.id,
          status: "WAITING",
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
