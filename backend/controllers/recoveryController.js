import User from "../models/User.js";
import { generateRecoveryPhrase, wrapMasterKey } from "../utils/recovery.js";

export const setupRecovery = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || !user.encryptedMasterKey)
      return res.status(400).json({ message: "Vault not initialized" });

    if (user.recovery?.enabled)
      return res.status(400).json({ message: "Recovery already enabled" });

    // Generate mnemonic and a derived key
    const mnemonic = generateRecoveryPhrase();

    const wrapped = await wrapMasterKey(
      Buffer.from(user.encryptedMasterKey, "base64"),
      mnemonic
    );

    user.recovery = {
      wrappedMasterKey: wrapped.wrappedMasterKey,
      nonce: wrapped.nonce,
      salt: wrapped.salt,
      enabled: true
    };

    await user.save();

    // Only send mnemonic once
    res.json({ mnemonic });
  } catch (err) {
    console.error("Setup recovery error:", err);
    res.status(500).json({ message: "Failed to setup recovery" });
  }
};