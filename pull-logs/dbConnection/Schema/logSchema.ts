import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  values: {
    type: String,
    required: true,
  },
  page: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    required: true,
  },
  timestamp: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
});

export const Log = mongoose.models.Log || mongoose.model("Log", logSchema);