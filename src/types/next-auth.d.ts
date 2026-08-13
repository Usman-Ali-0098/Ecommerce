import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;

    role: "USER" | "ADMIN";

    fullName: string;

    rememberMe?: boolean;
  }

  interface Session {
    user: {
      id: string;

      role: "USER" | "ADMIN";

      fullName: string;

      email?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;

    role?: "USER" | "ADMIN";

    fullName?: string;

    rememberMe?: boolean;

    sessionExpiresAt?: number;
  }
}
