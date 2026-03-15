import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/onboarding
 * Returns whether the current user has completed onboarding (has email set).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, preferredRegion: true },
  });

  return NextResponse.json({
    needsOnboarding: !user?.email,
    email: user?.email ?? null,
    preferredRegion: user?.preferredRegion ?? null,
  });
}

/**
 * POST /api/onboarding
 * Saves user email and preferred region. Required before using the platform.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, preferredRegion } = body;

  // Validate email
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Validate region
  const validRegions = ["centralindia", "southeastasia", "westeurope", "eastus"];
  if (!preferredRegion || !validRegions.includes(preferredRegion)) {
    return NextResponse.json({ error: "Please select a valid region" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email, preferredRegion },
  });

  return NextResponse.json({ success: true });
}
