import { nanoid } from "nanoid";
import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
  },
  { timestamps: true }
);

export const User = models.User || model("User", userSchema, "user");

const sessionSchema = new Schema(
  {
    id: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export const Session =
  models.Session || model("Session", sessionSchema, "session");

const accountSchema = new Schema(
  {
    id: { type: String, required: true },
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    accessToken: { type: String },
    refreshToken: { type: String },
    idToken: { type: String },
    accessTokenExpiresAt: { type: Date },
    refreshTokenExpiresAt: { type: Date },
    scope: { type: String },
    password: { type: String },
  },
  { timestamps: true }
);

export const Account =
  models.Account || model("Account", accountSchema, "account");

const verificationSchema = new Schema(
  {
    id: { type: String, required: true },
    identifier: { type: String, required: true, index: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Verification =
  models.Verification || model("Verification", verificationSchema, "verification");

const agentSchema = new Schema(
  {
    id: { type: String, default: () => nanoid() },
    name: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    instructions: { type: String, required: true },
  },
  { timestamps: true }
);

export const Agents = models.Agents || model("Agents", agentSchema, "agents");

const meetingSchema = new Schema(
  {
    id: { type: String, default: () => nanoid() },
    name: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "processing", "cancelled"],
      default: "upcoming",
    },

    startedAt: { type: Date },
    endedAt: { type: Date },
    transcriptUrl: { type: String },
    recordingUrl: { type: String },
    summary: { type: String },
  },
  { timestamps: true }
);

export const Meetings =
  models.Meetings || model("Meetings", meetingSchema, "meetings");