import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { getSteamPlayer, verifySteamOpenId } from "@/lib/steam";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      steamId: string;
      name: string;
      image: string;
      elo: number;
    };
  }

  interface User {
    id: string;
    steamId: string;
    name: string;
    image: string;
    elo: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    steamId: string;
    elo: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "steam",
      name: "Steam",
      credentials: {},
      async authorize(credentials, req) {
        // The query params from Steam's OpenID redirect
        const query = (req as any)?.query ?? {};

        // Verify the OpenID response with Steam
        const steamId = await verifySteamOpenId(query);
        if (!steamId) return null;

        // Fetch Steam profile
        const steamPlayer = await getSteamPlayer(steamId);
        if (!steamPlayer) return null;

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

        return {
          id: user.id,
          steamId: user.steamId,
          name: user.displayName,
          image: user.avatar,
          elo: user.elo,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.steamId = (user as any).steamId;
        token.elo = (user as any).elo;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        steamId: token.steamId,
        name: token.name ?? "",
        image: token.picture ?? "",
        elo: token.elo,
      };
      return session;
    },
  },

  pages: {
    signIn: "/",
    error: "/",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
