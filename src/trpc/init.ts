import { auth } from "@/lib/auth";
import { polarClient } from "@/lib/polar";
import { MAX_FREE_AGENTS, MAX_FREE_MEETINGS } from "@/modules/premium/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import { Meetings, Agents } from "@/db/schema";

export const createTRPCContext = cache(async () => {
  return { userId: "user_123" };
});

const t = initTRPC.create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  return next({ ctx: { ...ctx, auth: session } });
});

export const premiumProcedure = (entity: "meetings" | "agents") =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const userMeetingsCount = await Meetings.countDocuments({
      userId: ctx.auth.user.id,
    });

    const userAgentsCount = await Agents.countDocuments({
      userId: ctx.auth.user.id,
    });

    const isPremium = customer.activeSubscriptions.length > 0;

    const isFreeAgentLimitReached =
      userAgentsCount >= MAX_FREE_AGENTS;

    const isFreeMeetingLimitReached =
      userMeetingsCount >= MAX_FREE_MEETINGS;

    const shouldThrowMeetingError =
      entity === "meetings" &&
      isFreeMeetingLimitReached &&
      !isPremium;

    const shouldThrowAgentError =
      entity === "agents" &&
      isFreeAgentLimitReached &&
      !isPremium;

    if (shouldThrowMeetingError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have reached the maximum number of free meetings",
      });
    }

    if (shouldThrowAgentError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have reached the maximum number of free agents",
      });
    }

    return next({ ctx: { ...ctx, customer } });
  });