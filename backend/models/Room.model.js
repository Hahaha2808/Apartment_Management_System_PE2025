import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true },
    price: { type: Number, required: true },
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    maxPeople: { type: Number, required: true, min: 1 },
    area: { type: Number, required: true, min: 0 },
    numberBedroom: { type: Number, required: true, min: 1 },
    allowMale: { type: Boolean },
    allowFemale: { type: Boolean },
    landlordID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      default: "available",
      enum: ["available", "rented", "disabled"],
    },
    address: { type: String, required: true },
    description: { type: String },
    image: { type: String },
  },
  {
    timestamps: true,
  }
);
roomSchema.index({ roomNumber: 1, address: 1 }, { unique: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
