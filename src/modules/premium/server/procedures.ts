import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { polarClient } from "@/lib/polar";
import { Meetings, Agents } from "@/db/schema";

export const premiumRouter = createTRPCRouter({
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const subscription = customer.activeSubscriptions[0];

    if (!subscription) {
      return null;
    }

    const product = await polarClient.products.get({
      id: subscription.productId,
    });

    return product;
  }),

  getProducts: protectedProcedure.query(async () => {
    const products = await polarClient.products.list({
      isArchived: false,
      isRecurring: true,
      sorting: ["price_amount"],
    });

    return products.result.items;
  }),

  getFreeUsage: protectedProcedure.query(async ({ ctx }) => {
    const customer = await polarClient.customers.getStateExternal({
      externalId: ctx.auth.user.id,
    });

    const subscription = customer.activeSubscriptions[0];

    if (subscription) {
      return null;
    }
    
    const meetingCount = await Meetings.countDocuments({
      userId: ctx.auth.user.id,
    });

    const agentCount = await Agents.countDocuments({
      userId: ctx.auth.user.id,
    });

    return {
      meetingCount,
      agentCount,
    };
  }),
});