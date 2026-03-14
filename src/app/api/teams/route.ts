import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentTeam, TEAM_SIZE } from "@/lib/teams";

export async function GET() {
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
      { error: currentUser.banReason || "Banned players cannot manage teams" },
      { status: 403 }
    );
  }

  const team = await getCurrentTeam(session.user.id);

  return NextResponse.json({
    team,
    isCaptain: team?.captainId === session.user.id,
    canQueue: (team?.members.length ?? 0) === TEAM_SIZE,
  });
}

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
      { error: currentUser.banReason || "Banned players cannot manage teams" },
      { status: 403 }
    );
  }

  const existingMembership = await prisma.teamMember.findUnique({
    where: { userId: session.user.id },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "You are already in a team" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const tag = String(body?.tag ?? "").trim().slice(0, 6);

  if (name.length < 3) {
    return NextResponse.json(
      { error: "Team name must be at least 3 characters" },
      { status: 400 }
    );
  }

  const team = await prisma.team.create({
    data: {
      name,
      tag: tag || null,
      captainId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
        },
      },
    },
    include: {
      captain: {
        select: {
          id: true,
          displayName: true,
          avatar: true,
          steamId: true,
          elo: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
              steamId: true,
              elo: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  return NextResponse.json({ team }, { status: 201 });
}
