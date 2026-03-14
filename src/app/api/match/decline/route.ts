import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { declineReadyCheck } from "@/lib/matchmaking";

/**
 * POST /api/match/decline - Decline ready check
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
    await declineReadyCheck(matchId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Decline ready check error:", error);
    return NextResponse.json(
      { error: "Failed to decline ready check" },
      { status: 500 }
    );
  }
}
