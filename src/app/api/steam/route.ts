import { NextResponse } from "next/server";
import { buildSteamOpenIdUrl } from "@/lib/steam";

/**
 * GET /api/steam
 * Redirects user to Steam OpenID login page.
 * NOTE: Must live outside /api/auth/ — next-auth intercepts that entire namespace.
 */
export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const returnUrl = `${baseUrl}/api/steam/callback`;
  const steamUrl = buildSteamOpenIdUrl(returnUrl);
  return NextResponse.redirect(steamUrl);
}
