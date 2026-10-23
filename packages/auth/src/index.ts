import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@qsi-medicine/db";
import * as schema from "@qsi-medicine/db/schema/auth";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { count, eq } from "drizzle-orm";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

export type Role = "manager" | "cashier";

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = [],
) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    user: {
      additionalFields: {
        // input: false → a user can never set these through sign-up/update requests
        role: { type: "string", defaultValue: "cashier", input: false },
        active: { type: "boolean", defaultValue: true, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          /**
           * Public sign-up is closed. The only self-registration allowed is the very first
           * account (bootstrap), which becomes the manager. All other staff accounts are
           * created by a manager from the Staff page (which writes to the DB directly).
           */
          before: async (user) => {
            const [row] = await database.select({ n: count() }).from(schema.user);
            if ((row?.n ?? 0) > 0) {
              throw new APIError("FORBIDDEN", {
                message: "Sign-up is closed. Ask a manager to create your account.",
              });
            }
            return { data: { ...user, role: "manager", active: true } };
          },
        },
      },
      session: {
        create: {
          // Deactivated staff cannot start a session.
          before: async (session) => {
            const [u] = await database
              .select({ active: schema.user.active })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId));
            if (!u?.active) {
              throw new APIError("FORBIDDEN", { message: "This account has been deactivated." });
            }
          },
        },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
