import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const action = String(body?.action ?? "");
  const reason = String(body?.reason ?? "").trim();

  if (!["ban", "unban"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data:
      action === "ban"
        ? { isBanned: true, banReason: reason || "Banned by admin" }
        : { isBanned: false, banReason: null },
    select: {
      id: true,
      isBanned: true,
      banReason: true,
    },
  });

  if (action === "ban") {
    const membership = await prisma.teamMember.findUnique({
      where: { userId: id },
      select: { teamId: true },
    });

    await prisma.queueEntry.deleteMany({
      where: {
        OR: [
          { userId: id },
          membership?.teamId ? { teamId: membership.teamId } : undefined,
        ].filter(Boolean) as { userId?: string; teamId?: string }[],
      },
    });
  }

  return NextResponse.json({ success: true, user });
}
