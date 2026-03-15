import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/users/search?q=<query>
 * Search for users by display name or Steam ID (for party invites).
 * Returns max 10 results. Excludes the requesting user.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        { isBanned: false },
        {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { steamId: { contains: q } },
          ],
        },
      ],
    },
    select: {
      id: true,
      displayName: true,
      avatar: true,
      steamId: true,
      elo: true,
    },
    take: 10,
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({ users });
}
