import { createHash, randomBytes } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

export function hashIp(value: string | undefined): string | null {
  return value ? hashToken(value) : null;
}
