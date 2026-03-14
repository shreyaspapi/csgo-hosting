import { NextAuthOptions } from "next-auth";

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
  providers: [],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.steamId = (user as { steamId: string; elo: number }).steamId;
        token.elo = (user as { steamId: string; elo: number }).elo;
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
