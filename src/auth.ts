import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { ensureStripeCustomer } from "@/lib/services/stripe-customer.service";

const ONE_HOUR = 60 * 60;

const DEFAULT_SESSION_MAX_AGE = 24 * ONE_HOUR;

const REMEMBER_SESSION_MAX_AGE = 48 * ONE_HOUR;

const ADMIN_SESSION_MAX_AGE = 8 * ONE_HOUR;

const SESSION_REVALIDATION_INTERVAL = 5 * 60 * 1000;

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
     * Facebook OAuth for customer
     * authentication.
     */
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,

      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
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

  // for google auth
  // ## 6. Purpose of the callback   The signIn callback answers:  Should this attempted authentication be allowed? It also performs the project’s custom database linking.

  callbacks: {
    async signIn({ user, account, profile }) {
      /*
       * Credentials authentication was
       * already handled by authorize().
       */
      if (account?.provider !== "google" && account?.provider !== "facebook") {
        return true;
      }

      const provider = account.provider;

      const email = user.email?.trim().toLowerCase();

      /*
       * Auth.js always populates
       * account.providerAccountId from
       * the provider's own stable user
       * id (profile.sub for Google,
       * profile.id for Facebook), so it
       * doesn't need to be read from the
       * raw profile by hand.
       */
      const providerAccountId = account.providerAccountId;

      if (!email || !providerAccountId) {
        return false;
      }

      /*
       * Google exposes a verified-email
       * claim. Facebook's Graph API only
       * ever returns an email once it's
       * already confirmed, so there's no
       * equivalent claim to check there.
       */
      if (provider === "google") {
        const emailVerified =
          profile &&
          "email_verified" in profile &&
          profile.email_verified === true;
        // This matters because the project uses email to link an existing credentials customer with a Google account.

        if (!emailVerified) {
          return false;
        }
      }

      /*
       * CASE 1
       *
       * OAuth account already exists.
       */
      const existingOAuthAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,

            providerAccountId,
          },
        },

        include: {
          user: true,
        },
      });

      if (existingOAuthAccount) {
        /*
         * Never authenticate ADMIN
         * through customer OAuth.
         */
        if (existingOAuthAccount.user.role !== "USER") {
          return false;
        }

        try {
          await ensureStripeCustomer({ userId: existingOAuthAccount.user.id });
        } catch (error) {
          console.error("Deferred Stripe customer creation:", error);
        }

        return true;
      }

      /*
       * CASE 2
       *
       * Existing credentials customer
       * uses OAuth for the first time.
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
         * Link the OAuth account to the
         * existing customer.
         */
        await prisma.account.create({
          data: {
            userId: existingUser.id,

            type: "oauth",

            provider,

            providerAccountId,
          },
        });

        try {
          await ensureStripeCustomer({ userId: existingUser.id });
        } catch (error) {
          console.error("Deferred Stripe customer creation:", error);
        }

        return true;
      }

      /*
       * CASE 3
       *
       * Completely new OAuth customer.
       */
      const fullName = user.name?.trim() || "Customer";

      /*
       * Create both records together.
       *
       * If Account creation fails,
       * User creation is rolled back.
       */
      const newUserId = await prisma.$transaction(async (tx) => {
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

            provider,

            providerAccountId,
          },
        });

        return newUser.id;
      });

      try {
        await ensureStripeCustomer({ userId: newUserId });
      } catch (error) {
        console.error("Deferred Stripe customer creation:", error);
      }

      return true;
    },

    ///////////////////////////////////////////////////////////

    async jwt({ token, user, account }) {
      /*
       * Initial OAuth login
       * (Google or Facebook).


       */
      if (account?.provider === "google" || account?.provider === "facebook") {
        const providerAccountId = account.providerAccountId;

        if (!providerAccountId) {
          return null;
        }

        /*
         * Google / Facebook
         *    ↓
         * Account
         *    ↓
         * User
         *
         * ## 19. Preventing provider identity from becoming application authority

  Google/Facebook provide data such as:

  email
  name
  profile image

  But the project’s database controls:

  local user ID
  application role
  application full name
         *
         *
         */
        const databaseAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,

              providerAccountId,
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

        token.authProvider = account.provider;

        token.authenticatedRole = "USER";

        token.lastValidatedAt = Date.now();

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

        token.authProvider = "credentials";

        token.authenticatedRole = user.role;

        token.lastValidatedAt = Date.now();

        const maxAge =
          user.role === "ADMIN"
            ? ADMIN_SESSION_MAX_AGE
            : rememberMe
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

      if (typeof token.id !== "string") {
        return null;
      }

      const shouldRevalidate =
        typeof token.lastValidatedAt !== "number" ||
        Date.now() - token.lastValidatedAt >= SESSION_REVALIDATION_INTERVAL;

      if (!shouldRevalidate) {
        return token;
      }

      const userId = Number(token.id);

      if (!Number.isInteger(userId)) {
        return null;
      }

      const currentUser = await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          fullName: true,
          role: true,
        },
      });

      if (!currentUser) {
        return null;
      }

      /*
       * A role change requires a fresh login instead of silently
       * elevating or converting an existing authenticated session.
       */
      if (
        token.authenticatedRole &&
        currentUser.role !== token.authenticatedRole
      ) {
        return null;
      }

      /*
       * Google/Facebook remain a customer-only authentication path.
       */
      if (
        (token.authProvider === "google" || token.authProvider === "facebook") &&
        currentUser.role !== "USER"
      ) {
        return null;
      }

      token.role = currentUser.role;

      token.fullName = currentUser.fullName;

      token.lastValidatedAt = Date.now();

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
