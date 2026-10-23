import { protectedProcedure, publicProcedure, router } from "../index";
import { posRouter } from "./pos";

export const appRouter = router({
  pos: posRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
});
export type AppRouter = typeof appRouter;
