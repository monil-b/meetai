import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
  },
  { timestamps: true }
);

export const User = models.User || model("User", userSchema, "users");

const sessionSchema = new Schema(
  {
    expiresAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Session =
  models.Session || model("Session", sessionSchema, "sessions");

const accountSchema = new Schema(
  {
    accountId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
  models.Account || model("Account", accountSchema, "accounts");

const verificationSchema = new Schema(
  {
    identifier: { type: String, required: true, index: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Verification = models.Verification || model("Verification", verificationSchema, "verifications");