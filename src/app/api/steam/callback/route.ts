import { NextRequest, NextResponse } from "next/server";
import { verifySteamOpenId, getSteamPlayer, getSteamBanStatus } from "@/lib/steam";
import prisma from "@/lib/prisma";
import { encode } from "next-auth/jwt";

/**
 * GET /api/steam/callback
 *
 * Steam OpenID redirects here after user authenticates.
 * Flow: verify sig → fetch profile → upsert user → mint JWT cookie → /dashboard
 *
 * NOTE: Lives at /api/steam (not /api/auth/steam) because next-auth intercepts
 * the entire /api/auth/* namespace.
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Extract all OpenID params Steam sent back
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Verify the OpenID response with Steam (server → Steam, checks sig + nonce)
  let steamId: string | null = null;
  try {
    steamId = await verifySteamOpenId(params);
  } catch (err) {
    console.error("[steam/callback] verification error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=steam_verify_failed`);
  }

  if (!steamId) {
    // Common cause in dev: nonce expired during first cold-start compilation.
    // Simply click "Sign in with Steam" again — it will work once compiled.
    console.warn("[steam/callback] Steam verification failed for claimed_id:", params["openid.claimed_id"]);
    return NextResponse.redirect(`${baseUrl}/?error=steam_auth_failed`);
  }

  // Fetch Steam player profile
  let steamPlayer;
  try {
    steamPlayer = await getSteamPlayer(steamId);
  } catch (err) {
    console.error("[steam/callback] getSteamPlayer error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=steam_profile_error`);
  }

  if (!steamPlayer) {
    console.error("[steam/callback] no player found for steamId:", steamId);
    return NextResponse.redirect(`${baseUrl}/?error=steam_profile_failed`);
  }

  // Check VAC ban status
  let banStatus = null;
  try {
    banStatus = await getSteamBanStatus(steamId);
  } catch (err) {
    console.warn("[steam/callback] ban check failed (non-fatal):", err);
  }

  // Block users with a VAC ban within the last 2 years
  if (banStatus?.vacBanned && banStatus.daysSinceLastBan < 730) {
    console.warn("[steam/callback] blocked VAC-banned user:", steamId);
    return NextResponse.redirect(`${baseUrl}/?error=vac_banned`);
  }

  // Upsert user in database
  let user;
  try {
    user = await prisma.user.upsert({
      where: { steamId },
      update: {
        displayName: steamPlayer.personaname,
        avatar: steamPlayer.avatarmedium,
        avatarFull: steamPlayer.avatarfull,
        profileUrl: steamPlayer.profileurl,
        vacBanned: banStatus?.vacBanned ?? false,
      },
      create: {
        steamId,
        displayName: steamPlayer.personaname,
        avatar: steamPlayer.avatarmedium,
        avatarFull: steamPlayer.avatarfull,
        profileUrl: steamPlayer.profileurl,
        vacBanned: banStatus?.vacBanned ?? false,
      },
    });
  } catch (err) {
    console.error("[steam/callback] db upsert error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=db_error`);
  }

  // Mint a next-auth JWT so getServerSession works everywhere
  let token: string;
  try {
    token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        steamId: user.steamId,
        name: user.displayName,
        picture: user.avatar,
        elo: user.elo,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  } catch (err) {
    console.error("[steam/callback] JWT encode error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=token_error`);
  }

  // Set session cookie (same name next-auth uses so getServerSession reads it)
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const response = NextResponse.redirect(`${baseUrl}/dashboard`);
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
