// config/db.js (or wherever you have it)
import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/saferah", {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("MongoDB connected – SafeRah ready");
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
};