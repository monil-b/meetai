import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { connectDB } from "@/db";
import { Meetings, Agents } from "@/db/schema";
import { generateAvatarUri } from "@/lib/avatar";
import { streamVideo } from "@/lib/stream-video";
import { serialize } from "@/lib/serialize";

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";

import { MeetingStatus } from "../types";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";

export const meetingsRouter = createTRPCRouter({
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        role: "admin",
        image:
          ctx.auth.user.image ??
          generateAvatarUri({ seed: ctx.auth.user.name, variant: "initials" }),
      },
    ]);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const issuedAt = Math.floor(Date.now() / 1000) - 60;

    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt,
    });

    return token;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await connectDB();

      const removedMeeting = await Meetings.findOneAndDelete({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!removedMeeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }

      return serialize(removedMeeting);
    }),

  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await connectDB();

      const updatedMeeting = await Meetings.findOneAndUpdate(
        { id: input.id, userId: ctx.auth.user.id },
        input,
        { new: true }
      );

      if (!updatedMeeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }

      return serialize(updatedMeeting);
    }),

  create: protectedProcedure
    .input(meetingsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      await connectDB();

      const createdMeeting = await Meetings.create({
        ...input,
        userId: ctx.auth.user.id,
      });

      const call = streamVideo.video.call("default", createdMeeting.id);

      await call.create({
        data: {
          created_by_id: ctx.auth.user.id,
          custom: {
            meetingId: createdMeeting.id,
            meetingName: createdMeeting.name,
          },
          settings_override: {
            transcription: {
              language: "en",
              mode: "auto-on",
              closed_caption_mode: "auto-on",
            },
            recording: {
              mode: "auto-on",
              quality: "1080p",
            },
          },
        },
      });

      const agent = await Agents.findOne({ id: createdMeeting.agentId });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      await streamVideo.upsertUsers([
        {
          id: agent.id,
          name: agent.name,
          role: "user",
          image: generateAvatarUri({
            seed: agent.name,
            variant: "botttsNeutral",
          }),
        },
      ]);

      return serialize(createdMeeting);
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await connectDB();

      const meeting = await Meetings.findOne({
        id: input.id,
        userId: ctx.auth.user.id,
      });

      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }

      const agent = await Agents.findOne({ id: meeting.agentId });

      let duration = 0;
      if (meeting.startedAt && meeting.endedAt) {
        duration =
          (new Date(meeting.endedAt).getTime() -
            new Date(meeting.startedAt).getTime()) /
          1000;
      }

      return serialize({
        ...meeting.toObject(),
        agent,
        duration,
      });
    }),

  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z.number().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
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

      const query: any = { userId: ctx.auth.user.id };

      if (search) query.name = { $regex: search, $options: "i" };
      if (status) query.status = status;
      if (agentId) query.agentId = agentId;

      const meetings = await Meetings.find(query)
        .sort({ createdAt: -1, id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const total = await Meetings.countDocuments(query);
      const totalPages = Math.ceil(total / pageSize);

      const agentIds = meetings.map((m) => m.agentId);
      const agents = await Agents.find({ id: { $in: agentIds } });

      const agentMap: Record<string, any> = {};
      agents.forEach((a) => {
        agentMap[a.id] = a;
      });

      const items = meetings.map((meeting) => {
        let duration = 0;
        if (meeting.startedAt && meeting.endedAt) {
          duration =
            (new Date(meeting.endedAt).getTime() -
              new Date(meeting.startedAt).getTime()) /
            1000;
        }

        return {
          ...meeting.toObject(),
          agent: agentMap[meeting.agentId],
          duration,
        };
      });

      return serialize({
        items,
        total,
        totalPages,
      });
    }),
});