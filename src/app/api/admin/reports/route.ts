import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ADMIN_IDS = (process.env.ADMIN_STEAM_IDS ?? "").split(",").filter(Boolean);

async function requireAdmin(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!ADMIN_IDS.includes(session.user.steamId)) return null;
  return session;
}

/**
 * GET /api/admin/reports
 * Returns paginated pending reports with reporter/reported info.
 */
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { status: "pending" },
      include: {
        reporter: { select: { id: true, displayName: true, avatar: true, steamId: true } },
        reported: { select: { id: true, displayName: true, avatar: true, steamId: true, isBanned: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.report.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({ reports, total, limit, offset });
}

/**
 * POST /api/admin/reports
 * Actions: dismiss a report or ban the reported user.
 * Body: { reportId: string, action: "dismiss" | "ban" }
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { reportId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reportId, action } = body;

  if (!reportId || !action) {
    return NextResponse.json({ error: "reportId and action are required" }, { status: 400 });
  }

  if (!["dismiss", "ban"].includes(action)) {
    return NextResponse.json({ error: 'action must be "dismiss" or "ban"' }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, reportedId: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (action === "ban") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: report.reportedId },
        data: { isBanned: true, banReason: "Banned after player reports" },
      }),
      // Dismiss all reports for this user
      prisma.report.updateMany({
        where: { reportedId: report.reportedId },
        data: { status: "reviewed" },
      }),
    ]);
  } else {
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "dismissed" },
    });
  }

  return NextResponse.json({ success: true });
}
