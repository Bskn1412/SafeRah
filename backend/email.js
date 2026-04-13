import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// OTP generator (UNCHANGED)
export function generateOtp(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return otp;
}

// SEND OTP EMAIL (RESEND VERSION)
export async function sendOtpEmail(email, otp) {
  const htmlContent = `
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

  try {
    const result = await resend.emails.send({
      from: import.meta.env.RESEND_FROM_EMAIL,
      to: email,
      subject: "Your SafeRaho verification code",
      html: htmlContent,
    });

    return result;
  } catch (err) {
    console.error("Resend Error:", err);
    throw err;
  }
}