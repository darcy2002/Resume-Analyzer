import { NextRequest } from "next/server";

/**
 * Extracts the client IP from the request headers.
 * Falls back to a random UUID so unknown IPs never share a rate-limit bucket.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    crypto.randomUUID()
  );
}
