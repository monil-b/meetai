import { z } from "zod";
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

      const agent = await Agent.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!agent) return null;

      return {
        meetingCount: 5, // TODO: replace with real count later
        ...agent.toObject(),
      };
    }),

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

      const items = await Agent.find(query)
        .sort({ createdAt: -1, id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const total = await Agent.countDocuments(query);

      const totalPages = Math.ceil(total / pageSize);

      return {
        items: items.map((item) => ({
          meetingCount: 6, // TODO: replace with real count later
          ...item.toObject(),
        })),
        total,
        totalPages,
      };
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