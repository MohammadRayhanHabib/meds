import { createAuth } from "@qsi-medicine/auth";
import { createDb } from "@qsi-medicine/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
