import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// AUTH SETUP
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});


// console.log("CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
// console.log("CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);
// console.log("REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);
// console.log("REFRESH_TOKEN:", process.env.GOOGLE_REFRESH_TOKEN);


const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// OTP GENERATOR (UNCHANGED)
export function generateOtp(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return otp;
}

// TEMPLATE (UNCHANGED DESIGN)
function buildOtpTemplate(otp) {
  return `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 30px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; padding: 24px; border-radius: 6px;">
      
      <h2 style="margin-top: 0; color: #111111; font-weight: 600;">
        Verify your email
      </h2>

      <p style="color: #444444; font-size: 14px; line-height: 1.5;">
        Hello,<br><br>
        You're one step away from completing your verification with <strong>SafeRaho</strong>.
        Please use the verification code below.
      </p>

      <div style="
        margin: 24px 0;
        padding: 16px;
        background-color: #f0f2f5;
        border-radius: 4px;
        text-align: center;
        font-size: 22px;
        letter-spacing: 6px;
        font-weight: bold;
        color: #111111;
        word-break: break-word;
      ">
        ${otp}
      </div>

      <p style="color: #444444; font-size: 14px;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="color: #777777; font-size: 12px; line-height: 1.5;">
        If you did not request this code, you can safely ignore this email.
        No further action is required.
      </p>

      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">

      <p style="color: #777777; font-size: 12px;">
        Regards,<br>
        SafeRaho Team
      </p>

    </div>
  </div>
  `;
}

// BASE64 ENCODER (GMAIL REQUIRES THIS)
function createRawEmail(to, subject, html) {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ];

  const message = messageParts.join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// SEND EMAIL VIA GMAIL API
export async function sendOtpEmail(email, otp) {
  try {
    const htmlContent = buildOtpTemplate(otp);

    const rawMessage = createRawEmail(
      email,
      "Your SafeRaho verification code",
      htmlContent
    );

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    return result;
  } catch (err) {
    console.error("FULL ERROR:", err.response?.data || err.message || err);
    throw err;
  }
}