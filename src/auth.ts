import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

const ONE_HOUR = 60 * 60;

const DEFAULT_SESSION_MAX_AGE = 24 * ONE_HOUR;

const REMEMBER_SESSION_MAX_AGE = 48 * ONE_HOUR;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    /*
     * Google OAuth for customer
     * authentication.
     */
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,

      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    /*
     * Credentials authentication.
     */
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
        const result = loginSchema.safeParse({
          email: credentials?.email,

          password: credentials?.password,
        });

        if (!result.success) {
          return null;
        }

        const { email, password } = result.data;

        const rememberMe = credentials?.rememberMe === "true";

        /*
         * Credentials login works
         * directly against User.
         */
        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        /*
         * Google-only customers may
         * legitimately have no local
         * password.
         */
        if (!user.password) {
          return null;
        }

        /*
         * Customer Auth.js must not
         * authenticate ADMIN accounts.
         */
        if (user.role !== "USER") {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          rememberMe,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: REMEMBER_SESSION_MAX_AGE,
  },

  jwt: {
    maxAge: REMEMBER_SESSION_MAX_AGE,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      /*
       * Credentials authentication was
       * already handled by authorize().
       */
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email?.trim().toLowerCase();

      const googleAccountId =
        typeof profile?.sub === "string" ? profile.sub : null;

      if (!email || !googleAccountId) {
        return false;
      }

      /*
       * Require Google's verified
       * email claim.
       */
      const emailVerified =
        profile &&
        "email_verified" in profile &&
        profile.email_verified === true;

      if (!emailVerified) {
        return false;
      }

      /*
       * CASE 1
       *
       * Google account already exists.
       */
      const existingGoogleAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",

            providerAccountId: googleAccountId,
          },
        },

        include: {
          user: true,
        },
      });

      if (existingGoogleAccount) {
        /*
         * Never authenticate ADMIN
         * through customer Google OAuth.
         */
        if (existingGoogleAccount.user.role !== "USER") {
          return false;
        }

        return true;
      }

      /*
       * CASE 2
       *
       * Existing credentials customer
       * uses Google for the first time.
       */
      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (existingUser) {
        if (existingUser.role !== "USER") {
          return false;
        }

        /*
         * Link Google account to the
         * existing customer.
         */
        await prisma.account.create({
          data: {
            userId: existingUser.id,

            type: "oauth",

            provider: "google",

            providerAccountId: googleAccountId,
          },
        });

        return true;
      }

      /*
       * CASE 3
       *
       * Completely new Google customer.
       */
      const fullName = user.name?.trim() || "Customer";

      /*
       * Create both records together.
       *
       * If Account creation fails,
       * User creation is rolled back.
       */
      await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            fullName,

            email,

            mobile: null,

            password: null,

            role: "USER",
          },
        });

        await tx.account.create({
          data: {
            userId: newUser.id,

            type: "oauth",

            provider: "google",

            providerAccountId: googleAccountId,
          },
        });
      });

      return true;
    },

    async jwt({ token, user, account, profile }) {
      /*
       * Initial Google login.
       */
      if (account?.provider === "google") {
        const googleAccountId =
          typeof profile?.sub === "string" ? profile.sub : null;

        if (!googleAccountId) {
          return null;
        }

        /*
         * Google
         *    ↓
         * Account
         *    ↓
         * User
         */
        const databaseAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",

              providerAccountId: googleAccountId,
            },
          },

          include: {
            user: true,
          },
        });

        if (!databaseAccount || databaseAccount.user.role !== "USER") {
          return null;
        }

        const databaseUser = databaseAccount.user;

        token.id = databaseUser.id.toString();

        token.role = "USER";

        token.fullName = databaseUser.fullName;

        token.rememberMe = false;

        token.sessionExpiresAt = Date.now() + DEFAULT_SESSION_MAX_AGE * 1000;

        return token;
      }

      /*
       * Initial credentials login.
       */
      if (user) {
        token.id = user.id;

        token.role = user.role;

        token.fullName = user.fullName;

        const rememberMe = Boolean(user.rememberMe);

        token.rememberMe = rememberMe;

        const maxAge = rememberMe
          ? REMEMBER_SESSION_MAX_AGE
          : DEFAULT_SESSION_MAX_AGE;

        token.sessionExpiresAt = Date.now() + maxAge * 1000;

        return token;
      }

      /*
       * Existing JWT.
       */
      if (
        typeof token.sessionExpiresAt === "number" &&
        Date.now() >= token.sessionExpiresAt
      ) {
        return null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }

        if (token.role === "USER" || token.role === "ADMIN") {
          session.user.role = token.role;
        }

        if (typeof token.fullName === "string") {
          session.user.fullName = token.fullName;
        }
      }

      return session;
    },
  },
});
