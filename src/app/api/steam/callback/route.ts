import { NextRequest, NextResponse } from "next/server";
import { verifySteamOpenId, getSteamPlayer } from "@/lib/steam";
import prisma from "@/lib/prisma";
import { encode } from "next-auth/jwt";

/**
 * GET /api/steam/callback
 * Steam redirects here after OpenID authentication.
 * We verify, upsert the user, mint a next-auth JWT, and redirect to dashboard.
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const steamId = await verifySteamOpenId(params);
    if (!steamId) {
      return NextResponse.redirect(`${baseUrl}/?error=steam_auth_failed`);
    }

    const steamPlayer = await getSteamPlayer(steamId);
    if (!steamPlayer) {
      return NextResponse.redirect(`${baseUrl}/?error=steam_profile_failed`);
    }

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

    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        steamId: user.steamId,
        name: user.displayName,
        picture: user.avatar,
        elo: user.elo,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60,
    });

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
  } catch (error) {
    console.error("Steam callback error:", error);
    return NextResponse.redirect(`${baseUrl}/?error=auth_error`);
  }
}
