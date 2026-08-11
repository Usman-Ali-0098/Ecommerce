import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

const ONE_HOUR = 60 * 60 ;

const DEFAULT_SESSION_MAX_AGE =
  12 * ONE_HOUR;

const REMEMBER_SESSION_MAX_AGE =
  48 * ONE_HOUR;

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

        rememberMe: {
          label: "Remember Me",
          type: "text",
        },
      },

      async authorize(credentials) {
        /*
         * Validate only the fields
         * required by loginSchema.
         */
        const result =
          loginSchema.safeParse({
            email:
              credentials?.email,

            password:
              credentials?.password,
          });

        if (!result.success) {
          return null;
        }

        const {
          email,
          password,
        } = result.data;

        /*
         * signIn() sends this as
         * "true" or "false".
         */
        const rememberMe =
          credentials?.rememberMe ===
          "true";

        const user =
          await prisma.user.findUnique({
            where: {
              email,
            },
          });

        if (!user) {
          return null;
        }

        const passwordMatches =
          await bcrypt.compare(
            password,
            user.password
          );

        if (!passwordMatches) {
          return null;
        }

        return {
          id:
            user.id.toString(),

          email:
            user.email,

          fullName:
            user.fullName,

          role:
            user.role,

          rememberMe,
        };
      },
    }),
  ],

  /*
   * Auth.js uses JWT sessions.
   *
   * 48 hours is the maximum
   * Auth.js session lifetime.
   *
   * Our custom sessionExpiresAt
   * controls whether this login
   * is actually valid for
   * 24 or 48 hours.
   */
  session: {
    strategy: "jwt",
    maxAge:
      REMEMBER_SESSION_MAX_AGE,
  },

  jwt: {
    maxAge:
      REMEMBER_SESSION_MAX_AGE,
  },

  callbacks: {
    async jwt({
      token,
      user,
    }) {
      /*
       * Initial successful login.
       *
       * `user` exists here when
       * credentials are accepted.
       */
      if (user) {
        token.id =
          user.id;

        token.role =
          user.role;

        token.fullName =
          user.fullName;

        const rememberMe =
          Boolean(
            user.rememberMe
          );

        token.rememberMe =
          rememberMe;

        const maxAge =
          rememberMe
            ? REMEMBER_SESSION_MAX_AGE
            : DEFAULT_SESSION_MAX_AGE;

        /*
         * Fixed application-level
         * expiry:
         *
         * unchecked = 24 hours
         * checked   = 48 hours
         */
        token.sessionExpiresAt =
          Date.now() +
          maxAge * 1000;

        return token;
      }

      /*
       * Existing session.
       *
       * If our fixed expiry has
       * passed, invalidate the JWT.
       */
      if (
        typeof token.sessionExpiresAt ===
          "number" &&
        Date.now() >=
          token.sessionExpiresAt
      ) {
        return null;
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      if (session.user) {
        /*
         * Avoid unsafe casts and
         * satisfy TypeScript.
         */
        if (
          typeof token.id ===
          "string"
        ) {
          session.user.id =
            token.id;
        }

        if (
          token.role ===
            "USER" ||
          token.role ===
            "ADMIN"
        ) {
          session.user.role =
            token.role;
        }

        if (
          typeof token.fullName ===
          "string"
        ) {
          session.user.fullName =
            token.fullName;
        }
      }

      /*
       * Do NOT manually assign
       * session.expires here.
       *
       * Auth.js manages that field.
       * Our custom fixed expiry is
       * stored in the JWT instead.
       */
      return session;
    },
  },
});