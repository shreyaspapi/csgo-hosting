import { NextResponse } from "next/server";
import { buildSteamOpenIdUrl } from "@/lib/steam";

/**
 * GET /api/auth/steam
 * Redirects user to Steam OpenID login page
 */
export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const returnUrl = `${baseUrl}/api/auth/steam/callback`;
  const steamUrl = buildSteamOpenIdUrl(returnUrl);

  return NextResponse.redirect(steamUrl);
}
