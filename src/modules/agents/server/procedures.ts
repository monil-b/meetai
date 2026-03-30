import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agentsInsertSchema } from "../schemas";
import { z } from "zod";
import { connectDB } from "@/db";
import { Agent } from "@/db/schema";

export const agentRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await connectDB();

      const agent = await Agent.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });
      
      return agent;
    }),

  getMany: protectedProcedure.query(async ({ ctx }) => {
    await connectDB();

    const agents = await Agent.find({
      userId: ctx.auth.user.id,
    });

    return agents;
  }),

  create: protectedProcedure
    .input(agentsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      await connectDB();

      const agent = await Agent.create({
        ...input,
        userId: ctx.auth.user.id,
      });

      return agent;
    }),
});
