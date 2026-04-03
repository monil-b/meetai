import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { connectDB } from "@/db";
import { Meetings } from "@/db/schema";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

export const meetingsRouter = createTRPCRouter({

  // Update meeting
    update: protectedProcedure
      .input(meetingsUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        await connectDB();
  
        const updatedMeeting = await Meetings.findOneAndUpdate(
          {
            id: input.id,
            userId: ctx.auth.user.id,
          },
          input,
          { new: true }
        );
  
        if (!updatedMeeting) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Meeting not found",
          });
        }
  
        return updatedMeeting;
      }),

  // Create meeting
    create: protectedProcedure
      .input(meetingsInsertSchema)
      .mutation(async ({ input, ctx }) => {
        await connectDB();
  
        const createdMeeting = await Meetings.create({
          ...input,
          userId: ctx.auth.user.id,
        });
  
        return createdMeeting;
      }),
      
  // Get single meeting
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await connectDB();

      const existingMeeting = await Meetings.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return existingMeeting;
    }),

  // Get many meetings (pagination + search)
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

      // search like ilike
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const items = await Meetings.find(query)
        .sort({ createdAt: -1, id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const total = await Meetings.countDocuments(query);
      const totalPages = Math.ceil(total / pageSize);

      return {
        items,
        total,
        totalPages,
      };
    }),
});