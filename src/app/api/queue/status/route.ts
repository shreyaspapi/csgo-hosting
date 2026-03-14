import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/queue/status - Check if the current user has been matched
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queueEntry = await prisma.queueEntry.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["WAITING", "MATCHED"] },
    },
    include: {
      match: {
        include: {
          readyChecks: {
            where: { userId: session.user.id },
            select: { expiresAt: true, status: true },
          },
        },
      },
    },
  });

  const teamMembership = await prisma.teamMember.findUnique({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          queueEntry: {
            include: {
              match: {
                include: {
                  readyChecks: {
                    where: { userId: session.user.id },
                    select: { expiresAt: true, status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const activeEntry = queueEntry ?? teamMembership?.team?.queueEntry ?? null;

  if (!activeEntry) {
    return NextResponse.json({ status: "not_in_queue" });
  }

  if (activeEntry.status === "MATCHED" && activeEntry.matchId) {
    const readyCheck = activeEntry.match?.readyChecks?.[0];
    return NextResponse.json({
      status: "matched",
      type: activeEntry.type,
      teamId: activeEntry.teamId,
      matchId: activeEntry.matchId,
      expiresAt: readyCheck?.expiresAt?.toISOString(),
      readyCheckStatus: readyCheck?.status,
    });
  }

  return NextResponse.json({
    status: "waiting",
    type: activeEntry.type,
    teamId: activeEntry.teamId,
    joinedAt: activeEntry.joinedAt.toISOString(),
  });
}
