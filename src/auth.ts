import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const result =
          loginSchema.safeParse(credentials);

        if (!result.success) {
          console.log("Invalid login credentials");
          return null;
        }

        const { email, password } = result.data;

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          console.log("User not found");
          return null;
        }

        const passwordMatches =
          await bcrypt.compare(
            password,
            user.password
          );

        if (!passwordMatches) {
          console.log("Invalid password");
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.fullName = user.fullName;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.fullName =
          token.fullName as string;
      }

      return session;
    },
  },
});