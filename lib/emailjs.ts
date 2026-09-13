import { send } from "@emailjs/nodejs";

const options = {
  publicKey: process.env.EMAILJS_PUBLIC_KEY!,
  privateKey: process.env.EMAILJS_PRIVATE_KEY!,
};

export async function sendSignupCode(toEmail: string, code: string) {
  await send(
    process.env.EMAILJS_SERVICE_ID!,
    process.env.EMAILJS_TEMPLATE_ID_SIGNUP!,
    { to_email: toEmail, code },
    options
  );
}

export async function sendResetCode(toEmail: string, code: string) {
  await send(
    process.env.EMAILJS_SERVICE_ID!,
    process.env.EMAILJS_TEMPLATE_ID_RESET!,
    { to_email: toEmail, code },
    options
  );
}
