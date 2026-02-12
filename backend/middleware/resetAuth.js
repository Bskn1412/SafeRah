import jwt from "jsonwebtoken";

export const resetAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  console.log("RESET AUTH HEADERS:", req.headers);

  if (!auth?.startsWith("Bearer ")) return res.sendStatus(401);

  console.log("RESET AUTH TOKEN:", auth);

  const token = auth.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.RECOVERY_SECRET);

    console.log("RESET TOKEN DECODED:", jwt.decode(token));

    if (payload.purpose !== "recovery") {
      return res.sendStatus(403);
    }

    req.userId = payload.userId; // TRUST THE TOKEN

    // ✅ Console message before moving to next middleware/route
    console.log(`RESET AUTH: Token verified, moving to next step for userId=${req.userId}`);

    next();
  } catch {
    return res.sendStatus(401);
  }
};
