import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const VALID_REASONS = ["cheating", "toxic", "griefing", "afk"] as const;
type ReportReason = (typeof VALID_REASONS)[number];

/**
 * POST /api/report
 * Submit a player report. One report per reporter/reported/match combo.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reportedId?: string; matchId?: string; reason?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reportedId, matchId, reason, description } = body;

  if (!reportedId) {
    return NextResponse.json({ error: "reportedId is required" }, { status: 400 });
  }

  if (!reason || !VALID_REASONS.includes(reason as ReportReason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }

  if (reportedId === session.user.id) {
    return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
  }

  // Verify the reported user exists
  const reportedUser = await prisma.user.findUnique({
    where: { id: reportedId },
    select: { id: true },
  });
  if (!reportedUser) {
    return NextResponse.json({ error: "Reported user not found" }, { status: 404 });
  }

  // One report per reporter/reported/match combo — update if already exists
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      reportedId,
      matchId: matchId ?? null,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.report.update({
      where: { id: existing.id },
      data: {
        reason,
        description: description ?? null,
        status: "pending",
      },
    });
  } else {
    await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reportedId,
        matchId: matchId ?? null,
        reason,
        description: description ?? null,
      },
    });
  }

  return NextResponse.json({ success: true });
}
