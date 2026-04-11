# MeetAI

MeetAI is a full-stack AI meeting assistant built with Next.js. Users can create AI agents, schedule and join meetings, get automatic transcripts and recordings, and review AI-generated summaries after calls.

## Features

- Authentication with Better Auth (email/password + Google + GitHub)
- Agent management (create, update, delete, search, paginate)
- Meeting management (create, update, delete, search, filter by status)
- Real-time video meetings powered by Stream Video
- Meeting chat powered by Stream Chat
- Call lifecycle handling via webhooks
- Automatic transcript + recording capture
- Async transcript processing with Inngest
- AI-generated structured meeting summaries using OpenAI
- Premium/free-tier usage limits with Polar billing integration

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- tRPC + TanStack Query
- MongoDB + Mongoose
- Better Auth
- Stream Video + Stream Chat
- Inngest
- OpenAI
- Polar
- Tailwind CSS 4 + shadcn/ui

## Project Structure

- `src/app`: Next.js routes, layouts, API route handlers
- `src/modules`: feature-based modules (`agents`, `meetings`, `premium`, etc.)
- `src/trpc`: tRPC initialization, routers, and client/server wiring
- `src/db`: MongoDB client/connection and Mongoose schemas
- `src/inngest`: background function definitions
- `src/lib`: service clients (auth, stream, polar, utilities)

## Environment Variables

Create a `.env` file in the project root with values for:

```bash
# App
NEXT_PUBLIC_APP_URL=

# Database
MONGODB_URI=

# Better Auth / OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stream Video
NEXT_PUBLIC_STREAM_VIDEO_API_KEY=
STREAM_VIDEO_SECRET_KEY=

# Stream Chat
NEXT_PUBLIC_STREAM_CHAT_API_KEY=
STREAM_CHAT_SECRET_KEY=

# OpenAI
OPENAI_API_KEY=

# Polar
POLAR_ACCESS_TOKEN=
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Add your `.env` values.

3. Run the dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Scripts

- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint
- `npm run dev:webhook`: expose local server via ngrok URL (for webhook testing)

## Core Flow

1. User creates an AI agent and schedules a meeting.
2. Stream call starts and webhook updates meeting state.
3. Transcription/recording events are received and saved.
4. Inngest job fetches transcript and enriches speaker metadata.
5. OpenAI generates a structured summary.
6. Meeting is marked completed and available in dashboard views.

## Notes

- Free-tier limits are enforced per user for meetings and agents.
- Premium access is resolved from Polar subscription state.
