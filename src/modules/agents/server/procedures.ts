import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { connectDB } from "@/db";
import { Agents } from "@/db/schema";
import { serialize } from "@/lib/serialize";

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

import { agentsInsertSchema, agentsUpdateSchema } from "../schemas";

export const agentsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(agentsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await connectDB();

      const updatedAgent = await Agents.findOneAndUpdate(
        {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        input,
        { new: true }
      );

      if (!updatedAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return serialize(updatedAgent);
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();

      const removedAgent = await Agents.findOneAndDelete({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!removedAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return serialize(removedAgent);
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await connectDB();

      const existingAgent = await Agents.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!existingAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return serialize({
        meetingCount: 5,
        ...existingAgent.toObject(),
      });
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
        query.name = { $regex: search, $options: "i" };
      }

      const data = await Agents.find(query)
        .sort({ createdAt: -1, id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const total = await Agents.countDocuments(query);
      const totalPages = Math.ceil(total / pageSize);

      return serialize({
        items: data.map((item) => ({
          meetingCount: 6,
          ...item.toObject(),
        })),
        total,
        totalPages,
      });
    }),

  create: protectedProcedure
    .input(agentsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      await connectDB();

      const createdAgent = await Agents.create({
        ...input,
        userId: ctx.auth.user.id,
      });

      return serialize(createdAgent);
    }),
});