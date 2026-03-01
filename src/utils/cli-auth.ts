import "server-only";

import { JWTPayload, SignJWT, jwtVerify } from "jose";

const secretKey = process.env.SESSION_SECRET;

if (!secretKey) {
  throw new Error("SESSION_SECRET must be configured for CLI authentication");
}

const encodedKey = new TextEncoder().encode(secretKey);

export type CliTokenPayload = JWTPayload & {
  userId: string;
  email: string;
  scope: "cli";
};

export async function issueCliToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, scope: "cli" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(encodedKey);
}

export async function verifyCliToken(token: string): Promise<CliTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    if (payload.scope !== "cli" || !payload.userId || !payload.email) {
      return null;
    }

    return payload as CliTokenPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return auth.slice(7).trim();
}
