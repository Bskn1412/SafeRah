// server.js — TOP OF FILE
import dotenv from "dotenv";
dotenv.config(); // ← THIS MUST BE FIRST

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import keysRoutes from "./routes/keys.js";


import filesRoutes from "./routes/files.js";
import { initGridFS } from "./config/gridfs.js";

// import authRecovery from "./routes/authRecovery.js";

import recoveryRoutes from "./routes/recovery.js";

import sanityRoutes from "./routes/sanity_files.js";
const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));  // <-- REQUIRED for req.cookies
app.use(cookieParser());  // ← THIS IS REQUIRED

app.use(cors({
  origin: "http://localhost:5173", // exact frontend port
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  exposedHeaders: ["Authorization"],
}));




await connectDB();
await initGridFS();


// Routes after middleware
app.use("/api/keys", keysRoutes);
app.use("/api/auth", authRoutes);


// Add route
// app.use("/api/files", filesRoutes);


app.use("/api/files", sanityRoutes);
// Authenticator recovery routes
// app.use("/auth", authRecovery);
//app.use(express.json({ limit: "100mb" })); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // ✅ optional


// app.use("/api/recovery", recoveryRoutes);


// server.js — ADD THIS (temporary, delete later!)
app.get("/api/debug/users", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).send("Not found");
  }

  try {
    const users = await mongoose.connection.db.collection("users").find({}).toArray();
    // If your collection is named differently (e.g. "User", "members"), change "users" above

    res.json({
      totalUsers: users.length,
      users: users.map(u => ({
        email: u.email,
        passwordHash: u.password,
        id: u._id
      }))
    });
  } catch (err) {
    res.json({ error: err.message, tip: "Check collection name: users / User / members" });
  }
});



app.listen(5000, () => console.log("Server running on 5000"));


console.log("2FA:", !!process.env.APP_2FA_SECRET);
console.log("JWT:", !!process.env.JWT_SECRET);
