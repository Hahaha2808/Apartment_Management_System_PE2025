import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  currentTokenHash: { type: String, required: true },
  tokenHashes: { type: [String], required: true },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
  expiresAt: { type: Date, required: true, immutable: true },
  revokedAt: { type: Date, default: null },
});

refreshSessionSchema.index({ tokenHashes: 1 }, { unique: true });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshSession", refreshSessionSchema);
