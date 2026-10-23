import { user } from "@qsi-medicine/db/schema/auth";
import { auditLog } from "@qsi-medicine/db/schema/pos";
import { and, desc, eq, gte, like, lt } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, router } from "../../index";
import { isoDate, periodRange } from "./_shared";

export const auditRouter = router({
  /** Activity log. `area` filters by action prefix, e.g. "product", "stock", "sale", "staff". */
  list: managerProcedure
    .input(
      z
        .object({ area: z.string().optional(), userId: z.string().optional(), from: isoDate.optional(), to: isoDate.optional() })
        .optional(),
    )
    .query(({ ctx, input: i }) =>
      ctx.db
        .select({
          id: auditLog.id,
          createdAt: auditLog.createdAt,
          action: auditLog.action,
          entity: auditLog.entity,
          entityId: auditLog.entityId,
          summary: auditLog.summary,
          userId: auditLog.userId,
          by: user.name,
        })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.userId))
        .where(
          and(
            i?.area ? like(auditLog.action, `${i.area}.%`) : undefined,
            i?.userId ? eq(auditLog.userId, i.userId) : undefined,
            i?.from ? gte(auditLog.createdAt, periodRange("day", i.from).from) : undefined,
            i?.to ? lt(auditLog.createdAt, periodRange("day", i.to).to) : undefined,
          ),
        )
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(500),
    ),
});
