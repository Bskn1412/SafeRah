// backend/middleware/vaultAuthMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const vaultAuthMiddleware = async (req, res, next) => {
  let token;

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    token = auth.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // 1️⃣ try login JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.authType = "login";
    return next();
  } catch {}

  // 2️⃣ try recovery token (REUSE YOUR STORAGE)
  const user = await User.findOne({
    "recovery.sessionToken": token,
    "recovery.expiresAt": { $gt: new Date() },
  });

  if (!user) {
    console.log("No valid recovery session found for token");
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.userId = user._id;
  req.authType = "recovery";
  next();
};
