import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { connectDB } from "@/db";
import { Agent } from "@/db/schema";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { agentsInsertSchema } from "../schemas";

export const agentsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await connectDB();

      const existingAgent = await Agent.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return {
        meetingCount: 5, // TODO: replace with real count
        ...existingAgent.toObject(),
      };
    }),

  // Get many agents (pagination + search)
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      await connectDB();

      const { search, page, pageSize } = input;

      const query: any = {
        userId: ctx.auth.user.id,
      };

      if (search) {
        query.name = { $regex: search, $options: "i" }; // like ilike
      }

      const data = await Agent.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const total = await Agent.countDocuments(query);
      const totalPages = Math.ceil(total / pageSize);

      return {
        items: data.map((item) => ({
          meetingCount: 5, // TODO: replace with real count
          ...item.toObject(),
        })),
        total,
        totalPages,
      };
    }),

  // Create agent
  create: protectedProcedure
    .input(agentsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      await connectDB();

      const createdAgent = await Agent.create({
        ...input,
        userId: ctx.auth.user.id,
      });

      return createdAgent;
    }),
});