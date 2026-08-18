import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const SESSION_SHORT = 24 * 60 * 60;
const SESSION_LONG = 30 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_SHORT },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        const rememberMe =
          credentials.remember === "1" ||
          credentials.remember === "true" ||
          credentials.remember === "on";
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar ?? undefined,
          rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        const remember = user.rememberMe;
        const maxAge = remember ? SESSION_LONG : SESSION_SHORT;
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }
      if (trigger === "update" && session?.name !== undefined) {
        token.name = session.name as string;
      }
      if (trigger === "update" && session?.image !== undefined) {
        token.picture = session.image as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface User {
    rememberMe?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
