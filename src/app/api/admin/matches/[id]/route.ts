import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { MatchStatus, ServerStatus } from "@prisma/client";
import { deallocateServer } from "@/lib/azure-server";
import { forceEndMatch } from "@/lib/rcon";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const action = String(body?.action ?? "");

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      server: true,
      readyChecks: true,
      queueEntries: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (!["cancel", "force_end"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (
    action === "force_end" &&
    match.server?.ip &&
    match.server?.rconPassword &&
    match.server?.status === ServerStatus.IN_USE
  ) {
    try {
      await forceEndMatch({
        host: match.server.ip,
        port: match.server.port,
        password: match.server.rconPassword,
      });
    } catch (error) {
      console.error("Admin force end failed:", error);
    }
  }

  await prisma.match.update({
    where: { id },
    data: {
      status: MatchStatus.CANCELLED,
      finishedAt: new Date(),
    },
  });

  if (match.status === MatchStatus.READY_CHECK) {
    await prisma.queueEntry.updateMany({
      where: { matchId: id },
      data: { status: "WAITING", matchId: null },
    });
  } else {
    await prisma.queueEntry.deleteMany({
      where: { matchId: id },
    });
  }

  if (match.serverId) {
    await prisma.gameServer.update({
      where: { id: match.serverId },
      data: { currentMatchId: null },
    });

    deallocateServer(match.serverId).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
