import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acceptReadyCheck } from "@/lib/matchmaking";

/**
 * POST /api/match/accept - Accept ready check
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await req.json();
  if (!matchId) {
    return NextResponse.json(
      { error: "matchId required" },
      { status: 400 }
    );
  }

  try {
    const result = await acceptReadyCheck(matchId, session.user.id);

    // allReady now moves match to DRAFT (captain pick phase), not CONFIGURING.
    // orchestrateMatch is triggered later by the draft endpoint once picks are done.

    return NextResponse.json(result);
  } catch (error) {
    console.error("Accept ready check error:", error);
    return NextResponse.json(
      { error: "Failed to accept ready check" },
      { status: 500 }
    );
  }
}
