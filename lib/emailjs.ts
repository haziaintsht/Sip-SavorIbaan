import { send } from "@emailjs/nodejs";

const options = {
  publicKey: process.env.EMAILJS_PUBLIC_KEY!,
  privateKey: process.env.EMAILJS_PRIVATE_KEY!,
};

// Matches EmailJS's "One-Time Password" template's own variable names
// ({{email}}, {{passcode}}, {{time}}) — one shared template covers both
// signup verification and password reset, since its copy is generic.
function formatExpiry(expiresAt: Date) {
  return expiresAt.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function sendCode(toEmail: string, code: string, expiresAt: Date) {
  await send(
    process.env.EMAILJS_SERVICE_ID!,
    process.env.EMAILJS_TEMPLATE_ID_OTP!,
    { email: toEmail, passcode: code, time: formatExpiry(expiresAt) },
    options
  );
}

export async function sendSignupCode(toEmail: string, code: string, expiresAt: Date) {
  return sendCode(toEmail, code, expiresAt);
}

export async function sendResetCode(toEmail: string, code: string, expiresAt: Date) {
  return sendCode(toEmail, code, expiresAt);
}
