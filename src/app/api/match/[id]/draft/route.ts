import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MatchStatus, MatchTeam } from "@prisma/client";
import { orchestrateMatch } from "@/lib/match-orchestrator";

// Pick order: A B B A A B B A  (0=Team A captain, 1=Team B captain)
const PICK_ORDER = [0, 1, 1, 0, 0, 1, 1, 0] as const;

function getCurrentCaptainId(
  draftPick: number,
  captainAId: string,
  captainBId: string
): string {
  return PICK_ORDER[draftPick] === 0 ? captainAId : captainBId;
}

/**
 * POST /api/match/[id]/draft
 * Body: { targetUserId: string }
 *
 * The current captain picks a player to join their team.
 * After 8 picks the draft completes, teams are finalised, and
 * the match moves to CONFIGURING to trigger server provisioning.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;
  const body = await req.json();
  const { targetUserId } = body as { targetUserId?: string };

  if (!targetUserId) {
    return NextResponse.json(
      { error: "targetUserId required" },
      { status: 400 }
    );
  }

  // Fetch the match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: { user: { select: { id: true, elo: true } } },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status !== MatchStatus.DRAFT) {
    return NextResponse.json(
      { error: "Match is not in draft phase" },
      { status: 409 }
    );
  }

  // Parse current draft state
  const draftTeamA: string[] = JSON.parse(match.draftTeamA);
  const draftTeamB: string[] = JSON.parse(match.draftTeamB);
  const captainAId = draftTeamA[0];
  const captainBId = draftTeamB[0];

  // Determine whose turn it is
  const currentCaptainId = getCurrentCaptainId(
    match.draftPick,
    captainAId,
    captainBId
  );

  if (session.user.id !== currentCaptainId) {
    return NextResponse.json(
      { error: "It is not your turn to pick" },
      { status: 403 }
    );
  }

  // Validate target is in the match
  const allPlayerIds = match.players.map((p) => p.user.id);
  if (!allPlayerIds.includes(targetUserId)) {
    return NextResponse.json(
      { error: "Player is not in this match" },
      { status: 400 }
    );
  }

  // Validate target has not already been drafted
  const alreadyDrafted = new Set([...draftTeamA, ...draftTeamB]);
  if (alreadyDrafted.has(targetUserId)) {
    return NextResponse.json(
      { error: "Player has already been drafted" },
      { status: 400 }
    );
  }

  // Add player to the captain's team
  const isTeamA = PICK_ORDER[match.draftPick] === 0;
  const newDraftTeamA = isTeamA
    ? [...draftTeamA, targetUserId]
    : draftTeamA;
  const newDraftTeamB = isTeamA
    ? draftTeamB
    : [...draftTeamB, targetUserId];

  const newDraftPick = match.draftPick + 1;
  const isComplete = newDraftPick >= 8;

  if (isComplete) {
    // Finalise the draft: assign teams in MatchPlayer and move to CONFIGURING
    const teamASet = new Set(newDraftTeamA);
    // teamBSet derived from match.players minus teamASet
    void new Set(newDraftTeamB);

    await prisma.$transaction(async (tx) => {
      // Update every MatchPlayer with the correct team and captain flag
      for (const p of match.players) {
        const uid = p.user.id;
        const team = teamASet.has(uid) ? MatchTeam.TEAM_A : MatchTeam.TEAM_B;
        const isCaptain = uid === captainAId || uid === captainBId;

        await tx.matchPlayer.update({
          where: { matchId_userId: { matchId, userId: uid } },
          data: { team, isCaptain },
        });
      }

      // Move match to CONFIGURING
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.CONFIGURING,
          draftPick: newDraftPick,
          draftTeamA: JSON.stringify(newDraftTeamA),
          draftTeamB: JSON.stringify(newDraftTeamB),
        },
      });
    });

    // Kick off server provisioning outside the transaction
    await orchestrateMatch(matchId);

    return NextResponse.json({
      draftPick: newDraftPick,
      draftTeamA: newDraftTeamA,
      draftTeamB: newDraftTeamB,
      isComplete: true,
      currentCaptainId: null,
    });
  }

  // Draft is still in progress — save state
  const nextCaptainId = getCurrentCaptainId(newDraftPick, captainAId, captainBId);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      draftPick: newDraftPick,
      draftTeamA: JSON.stringify(newDraftTeamA),
      draftTeamB: JSON.stringify(newDraftTeamB),
    },
  });

  return NextResponse.json({
    draftPick: newDraftPick,
    draftTeamA: newDraftTeamA,
    draftTeamB: newDraftTeamB,
    isComplete: false,
    currentCaptainId: nextCaptainId,
  });
}
