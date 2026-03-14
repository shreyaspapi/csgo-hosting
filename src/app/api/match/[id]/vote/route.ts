import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isCompetitiveMap } from "@/lib/maps";

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
  const map = body?.map;

  if (!map || !isCompetitiveMap(map)) {
    return NextResponse.json({ error: "Invalid map" }, { status: 400 });
  }

  const matchPlayer = await prisma.matchPlayer.findUnique({
    where: {
      matchId_userId: {
        matchId,
        userId: session.user.id,
      },
    },
    include: {
      match: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!matchPlayer?.match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (matchPlayer.match.status !== "READY_CHECK") {
    return NextResponse.json(
      { error: "Map voting is closed" },
      { status: 400 }
    );
  }

  const vote = await prisma.mapVote.upsert({
    where: {
      matchId_userId: {
        matchId,
        userId: session.user.id,
      },
    },
    create: {
      matchId,
      userId: session.user.id,
      map,
    },
    update: {
      map,
    },
    select: {
      map: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, vote });
}
