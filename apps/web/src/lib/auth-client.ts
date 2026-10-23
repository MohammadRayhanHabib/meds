import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ENV } from "../env";

export const authClient = createAuthClient({
  baseURL: ENV.VITE_SERVER_URL,
  // Mirrors the server's user.additionalFields so session.user.role / .active are typed.
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", input: false },
        active: { type: "boolean", input: false },
      },
    }),
  ],
});

export type StaffRole = "manager" | "cashier";
