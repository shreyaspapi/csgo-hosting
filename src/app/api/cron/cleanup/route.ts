import { NextResponse } from "next/server";
import { handleExpiredReadyChecks } from "@/lib/matchmaking";
import { cleanupOldServers } from "@/lib/azure-server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [expiredMatchIds, cleanedServers] = await Promise.all([
      handleExpiredReadyChecks(),
      cleanupOldServers(),
    ]);

    return NextResponse.json({
      expiredMatches: expiredMatchIds.length,
      expiredMatchIds,
      cleanedServers,
    });
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
