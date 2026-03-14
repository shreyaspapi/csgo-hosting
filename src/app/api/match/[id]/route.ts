import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/match/[id] - Get match details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              steamId: true,
              displayName: true,
              avatar: true,
              elo: true,
            },
          },
        },
      },
      readyChecks: {
        select: {
          userId: true,
          status: true,
          expiresAt: true,
        },
      },
      server: {
        select: {
          ip: true,
          port: true,
          status: true,
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(match);
}
