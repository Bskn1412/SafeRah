import User from "../models/User.js";

export const requireComplete = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.signupStage !== "complete") {
      return res.status(403).json({
        message: "Complete onboarding required before accessing vault",
        currentStage: user.signupStage
      });
    }

    next();
  } catch (err) {
    console.error("requireComplete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};