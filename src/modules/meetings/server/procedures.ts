import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { connectDB } from "@/db";
import { Meetings, Agents } from "@/db/schema";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { MeetingStatus } from "../types";

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

      const meeting = await Meetings.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!meeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      // get agent info
      const agent = await Agents.findOne({ id: meeting.agentId });

      // calculate duration
      let duration = 0;
      if (meeting.startedAt && meeting.endedAt) {
        duration =
          (new Date(meeting.endedAt).getTime() -
            new Date(meeting.startedAt).getTime()) /
          1000;
      }

      return {
        ...meeting.toObject(),
        agent,
        duration,
      };
    }),

  // Get many meetings
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
      agentId: z.string().nullish(),
      status: z
        .enum([
          MeetingStatus.Upcoming,
          MeetingStatus.Active,
          MeetingStatus.Completed,
          MeetingStatus.Processing,
          MeetingStatus.Cancelled,
        ])
        .nullish(),
    })
  )
  .query(async ({ ctx, input }) => {
    await connectDB();

    const { search, page, pageSize, status, agentId } = input;

    const query: any = {
      userId: ctx.auth.user.id,
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (status) {
      query.status = status;
    }

    if (agentId) {
      query.agentId = agentId;
    }

    const meetings = await Meetings.find(query)
      .sort({ createdAt: -1, id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const total = await Meetings.countDocuments(query);
    const totalPages = Math.ceil(total / pageSize);

    const items = await Promise.all(
      meetings.map(async (meeting) => {
        const agent = await Agents.findOne({ id: meeting.agentId });

        let duration = 0;
        if (meeting.startedAt && meeting.endedAt) {
          duration =
            (new Date(meeting.endedAt).getTime() -
              new Date(meeting.startedAt).getTime()) /
            1000;
        }

        return {
          ...meeting.toObject(),
          agent,
          duration,
        };
      })
    );

    return {
      items,
      total,
      totalPages,
    };
  }),
});