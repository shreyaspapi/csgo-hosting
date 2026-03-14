import { NextRequest, NextResponse } from "next/server";
import { verifySteamOpenId, getSteamPlayer } from "@/lib/steam";
import prisma from "@/lib/prisma";
import { encode } from "next-auth/jwt";

/**
 * GET /api/auth/steam/callback
 * Steam redirects here after authentication.
 * We verify the OpenID response, upsert the user, and create a session.
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    // Extract OpenID params from the URL
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Verify with Steam
    const steamId = await verifySteamOpenId(params);
    if (!steamId) {
      return NextResponse.redirect(`${baseUrl}/?error=steam_auth_failed`);
    }

    // Fetch player profile from Steam API
    const steamPlayer = await getSteamPlayer(steamId);
    if (!steamPlayer) {
      return NextResponse.redirect(`${baseUrl}/?error=steam_profile_failed`);
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { steamId },
      update: {
        displayName: steamPlayer.personaname,
        avatar: steamPlayer.avatarmedium,
        avatarFull: steamPlayer.avatarfull,
        profileUrl: steamPlayer.profileurl,
      },
      create: {
        steamId,
        displayName: steamPlayer.personaname,
        avatar: steamPlayer.avatarmedium,
        avatarFull: steamPlayer.avatarfull,
        profileUrl: steamPlayer.profileurl,
      },
    });

    // Create a NextAuth JWT token
    const token = await encode({
      token: {
        id: user.id,
        steamId: user.steamId,
        name: user.displayName,
        picture: user.avatar,
        elo: user.elo,
        sub: user.id,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the session cookie and redirect to dashboard
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    
    // Set the next-auth session token cookie
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Steam callback error:", error);
    return NextResponse.redirect(`${baseUrl}/?error=auth_error`);
  }
}
