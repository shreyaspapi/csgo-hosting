import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureTeamCaptain, getCurrentTeam, TEAM_SIZE } from "@/lib/teams";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isBanned: true, banReason: true },
  });

  if (actingUser?.isBanned) {
    return NextResponse.json(
      { error: actingUser.banReason || "Banned players cannot manage teams" },
      { status: 403 }
    );
  }

  const { id: teamId } = await params;
  const team = await ensureTeamCaptain(teamId, session.user.id);
  if (!team) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentTeam = await getCurrentTeam(session.user.id);
  if (!currentTeam || currentTeam.id !== teamId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (currentTeam.members.length >= TEAM_SIZE) {
    return NextResponse.json(
      { error: `Teams are limited to ${TEAM_SIZE} players` },
      { status: 400 }
    );
  }

  if (currentTeam.queueEntry?.status === "WAITING") {
    return NextResponse.json(
      { error: "Leave queue before changing the roster" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const steamId = String(body?.steamId ?? "").trim();

  if (!steamId) {
    return NextResponse.json({ error: "steamId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { steamId },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Player not found. Ask them to sign in first." },
      { status: 404 }
    );
  }

  if (user.isBanned) {
    return NextResponse.json(
      { error: "That player is banned and cannot join a team" },
      { status: 400 }
    );
  }

  if (user.id === session.user.id) {
    return NextResponse.json(
      { error: "You are already on the team" },
      { status: 400 }
    );
  }

  const existingMembership = await prisma.teamMember.findUnique({
    where: { userId: user.id },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "That player is already on another team" },
      { status: 400 }
    );
  }

  await prisma.teamMember.create({
    data: {
      teamId,
      userId: user.id,
    },
  });

  const updatedTeam = await getCurrentTeam(session.user.id);
  return NextResponse.json({ team: updatedTeam });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await params;
  const body = await req.json();
  const memberId = String(body?.memberId ?? "").trim();

  const team = await ensureTeamCaptain(teamId, session.user.id);
  if (!team) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentTeam = await getCurrentTeam(session.user.id);
  if (!currentTeam || currentTeam.id !== teamId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (currentTeam.queueEntry?.status === "WAITING") {
    return NextResponse.json(
      { error: "Leave queue before changing the roster" },
      { status: 400 }
    );
  }

  if (!memberId || memberId === currentTeam.captainId) {
    return NextResponse.json(
      { error: "Choose a non-captain member to remove" },
      { status: 400 }
    );
  }

  await prisma.teamMember.delete({
    where: {
      userId: memberId,
    },
  });

  const updatedTeam = await getCurrentTeam(session.user.id);
  return NextResponse.json({ team: updatedTeam });
}
