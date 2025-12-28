import jwt from "jsonwebtoken";

export const recoveryAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.sendStatus(401);

  const token = auth.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "recovery") throw new Error();
    req.userId = payload.uid;
    next();
  } catch {
    res.sendStatus(401);
  }
};
