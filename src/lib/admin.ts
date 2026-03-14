import { Session } from "next-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getAdminSteamIds() {
  return (process.env.ADMIN_STEAM_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAdminSession(session: Session | null) {
  if (!session?.user?.steamId) return false;
  return getAdminSteamIds().includes(session.user.steamId);
}

export function requireAdmin(session: Session | null) {
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function getAdminOverview() {
  const [users, matches, servers, queues] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        steamId: true,
        avatar: true,
        elo: true,
        wins: true,
        losses: true,
        draws: true,
        isBanned: true,
        banReason: true,
        updatedAt: true,
      },
      orderBy: [{ isBanned: "desc" }, { updatedAt: "desc" }],
      take: 25,
    }),
    prisma.match.findMany({
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        queueEntries: {
          include: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.gameServer.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.queueEntry.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 20,
    }),
  ]);

  return { users, matches, servers, queues };
}
