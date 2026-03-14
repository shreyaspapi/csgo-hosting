import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { QueueType } from "@prisma/client";
import { checkSoloQueue, createMatch, getQueueStats } from "@/lib/matchmaking";

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

  const body = await req.json();
  const { type = "SOLO", region = "centralindia", teamId } = body;

  // Remove any stale queue entry first (handles DB unique constraint on userId)
  // A stale entry can exist if the user closed the tab mid-queue
  await prisma.queueEntry.deleteMany({
    where: {
      userId: session.user.id,
      status: { in: ["WAITING", "MATCHED"] },
    },
  });

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

  // Create queue entry
  const entry = await prisma.queueEntry.create({
    data: {
      userId: session.user.id,
      type: type === "TEAM" ? QueueType.TEAM : QueueType.SOLO,
      teamId: type === "TEAM" ? teamId : undefined,
      region,
      status: "WAITING",
    },
  });

  // Check if we can make a match
  let matchId: string | null = null;
  if (type === "SOLO") {
    const players = await checkSoloQueue(region);
    if (players) {
      matchId = await createMatch(players, region);
    }
  }

  const stats = await getQueueStats(region);

  return NextResponse.json({
    queueEntryId: entry.id,
    matchId,
    stats,
  });
}

/**
 * DELETE /api/queue - Leave the queue
 */
export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.queueEntry.deleteMany({
    where: {
      userId: session.user.id,
      status: "WAITING",
    },
  });

  return NextResponse.json({ success: true });
}
