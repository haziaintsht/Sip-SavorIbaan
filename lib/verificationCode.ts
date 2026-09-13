import crypto from "crypto";

export function generateCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export const CODE_TTL_MINUTES = 15;
