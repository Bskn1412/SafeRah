// backend/middleware/recoveryAuth.js
import jwt from "jsonwebtoken";

export const recoveryAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.sendStatus(401);

  const token = auth.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.RECOVERY_SECRET);

    if (payload.purpose !== "recovery") {
      console.log("Token purpose is not 'recovery':", payload.purpose);
      return res.sendStatus(403);
    }

    req.userId = payload.userId;
    next();
  } catch (err) {
    console.log("Recovery token verification failed:", err.message);
    res.sendStatus(401);
  }
};
