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

  // Check for an active queue entry
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

  if (!queueEntry) {
    return NextResponse.json({ status: "not_in_queue" });
  }

  if (queueEntry.status === "MATCHED" && queueEntry.matchId) {
    const readyCheck = queueEntry.match?.readyChecks?.[0];
    return NextResponse.json({
      status: "matched",
      matchId: queueEntry.matchId,
      expiresAt: readyCheck?.expiresAt?.toISOString(),
      readyCheckStatus: readyCheck?.status,
    });
  }

  return NextResponse.json({
    status: "waiting",
    joinedAt: queueEntry.joinedAt.toISOString(),
  });
}
