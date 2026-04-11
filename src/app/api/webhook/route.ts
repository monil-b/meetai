import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import type { RealtimeClient } from "@stream-io/openai-realtime-api";
import {
  MessageNewEvent,
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallRecordingReadyEvent,
  CallSessionParticipantLeftEvent,
  CallSessionStartedEvent,
} from "@stream-io/node-sdk";

import { connectDB } from "@/db";
import { Agents, Meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { inngest } from "@/inngest/client";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const activeRealtimeClients = new Map<string, RealtimeClient>();

type WebhookPayload = {
  type?: string;
  [key: string]: unknown;
};

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");

  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 }
    );
  }

  const body = await req.text();

  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDB();

  const eventType = payload?.type;

  // CALL STARTED
  if (eventType === "call.session_started") {
    const event = payload as unknown as CallSessionStartedEvent;
    const meetingId = event.call?.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    const existingMeeting = await Meetings.findOne({
      id: meetingId,
      status: { $nin: ["completed", "active", "cancelled", "processing"] },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await Meetings.updateOne(
      { id: existingMeeting.id },
      {
        status: "active",
        startedAt: new Date(),
      }
    );

    const existingAgent = await Agents.findOne({
      id: existingMeeting.agentId,
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const call = streamVideo.video.call("default", meetingId);

    const existingRealtimeClient = activeRealtimeClients.get(meetingId);

    if (existingRealtimeClient) {
      try {
        existingRealtimeClient.disconnect?.();
      } catch {
        // Ignore stale client cleanup failures.
      }
    }

    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: process.env.OPENAI_API_KEY!,
      agentUserId: existingAgent.id,
      model: "gpt-4o-realtime-preview-2025-06-03",
    });

    realtimeClient.updateSession({
      instructions: existingAgent.instructions,
      modalities: ["text", "audio"],
      voice: "alloy",
      turn_detection: {
        type: "server_vad",
      },
      input_audio_transcription: {
        model: "whisper-1",
      },
    });

    activeRealtimeClients.set(meetingId, realtimeClient);
  }

  // PARTICIPANT LEFT
  else if (eventType === "call.session_participant_left") {
    const event = payload as unknown as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid.split(":")[1];

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    const call = streamVideo.video.call("default", meetingId);
    await call.end();
  }

  // CALL ENDED
  else if (eventType === "call.session_ended") {
    const event = payload as unknown as CallEndedEvent;
    const meetingId = event.call?.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    await Meetings.updateOne(
      { id: meetingId, status: "active" },
      {
        status: "processing",
        endedAt: new Date(),
      }
    );

    const realtimeClient = activeRealtimeClients.get(meetingId);
    if (realtimeClient) {
      try {
        realtimeClient.disconnect?.();
      } finally {
        activeRealtimeClients.delete(meetingId);
      }
    }
  }

  // TRANSCRIPTION READY
  else if (eventType === "call.transcription_ready") {
    const event = payload as unknown as CallTranscriptionReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    const updatedMeeting = await Meetings.findOneAndUpdate(
      { id: meetingId },
      { transcriptUrl: event.call_transcription.url },
      { new: true }
    );

    if (!updatedMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await inngest.send({
      name: "meetings/processing",
      data: {
        meetingId: updatedMeeting.id,
        transcriptUrl: updatedMeeting.transcriptUrl,
      },
    });
  }

  // RECORDING READY
  else if (eventType === "call.recording_ready") {
    const event = payload as unknown as CallRecordingReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    await Meetings.updateOne(
      { id: meetingId },
      {
        recordingUrl: event.call_recording.url,
      }
    );
  }

  // MESSAGE.NEW (AI CHAT)
  else if (eventType === "message.new") {
    const event = payload as unknown as MessageNewEvent;

    const userId = event.user?.id;
    const channelId = event.channel_id;
    const text = event.message?.text;

    if (!userId || !channelId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingMeeting = await Meetings.findOne({
      id: channelId,
      status: "completed",
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const existingAgent = await Agents.findOne({
      id: existingMeeting.agentId,
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (userId !== existingAgent.id) {
      const instructions = `
      You are an AI assistant helping the user revisit a recently completed meeting.
      Below is a summary of the meeting, generated from the transcript:
      
      ${existingMeeting.summary}
      
      The following are your original instructions from the live meeting assistant. Please continue to follow these behavioral guidelines as you assist the user:
      
      ${existingAgent.instructions}
      
      The user may ask questions about the meeting, request clarifications, or ask for follow-up actions.
      Always base your responses on the meeting summary above.
      
      You also have access to the recent conversation history between you and the user. Use the context of previous messages to provide relevant, coherent, and helpful responses. If the user's question refers to something discussed earlier, make sure to take that into account and maintain continuity in the conversation.
      
      If the summary does not contain enough information to answer a question, politely let the user know.
      
      Be concise, helpful, and focus on providing accurate information from the meeting and the ongoing conversation.
      `;

      const channel = streamChat.channel("messaging", channelId);
      await channel.watch();

      const previousMessages = channel.state.messages
        .slice(-5)
        .filter((msg) => msg.text && msg.text.trim() !== "")
        .map<ChatCompletionMessageParam>((message) => ({
          role: message.user?.id === existingAgent.id ? "assistant" : "user",
          content: message.text || "",
        }));

      const GPTResponse = await openaiClient.chat.completions.create({
        messages: [
          { role: "system", content: instructions },
          ...previousMessages,
          { role: "user", content: text },
        ],
        model: "gpt-4o",
      });

      const GPTResponseText = GPTResponse.choices[0].message.content;

      if (!GPTResponseText) {
        return NextResponse.json(
          { error: "No response from GPT" },
          { status: 400 }
        );
      }

      const avatarUrl = generateAvatarUri({
        seed: existingAgent.name,
        variant: "botttsNeutral",
      });

      streamChat.upsertUser({
        id: existingAgent.id,
        name: existingAgent.name,
        image: avatarUrl,
      });

      await channel.sendMessage({
        text: GPTResponseText,
        user: {
          id: existingAgent.id,
          name: existingAgent.name,
          image: avatarUrl,
        },
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}