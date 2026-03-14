import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentTeam } from "@/lib/teams";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const team = await getCurrentTeam(session.user.id);

  if (!team || team.id !== teamId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.queueEntry?.status === "WAITING") {
    return NextResponse.json(
      { error: "Leave queue before changing the team" },
      { status: 400 }
    );
  }

  if (team.captainId === session.user.id) {
    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({ success: true, deleted: true });
  }

  await prisma.teamMember.delete({
    where: {
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, deleted: false });
}
