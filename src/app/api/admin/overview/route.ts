import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminOverview, requireAdmin } from "@/lib/admin";

export async function GET() {
  const session = await getServerSession(authOptions);
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const overview = await getAdminOverview();
  return NextResponse.json(overview);
}
