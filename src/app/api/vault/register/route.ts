import {
  computeFingerprintFromPublicKeys,
  enforceFreshNonce,
  upsertIdentity,
  verifyEnvelopeSignature,
} from "@/lib/vault/server";
import type { RegisterPayload, SignedEnvelope } from "@/lib/vault/types";

export async function POST(request: Request) {
  try {
    const envelope = (await request.json()) as SignedEnvelope<RegisterPayload>;

    if (envelope.action !== "register") {
      return Response.json({ status: false, reason: "Invalid action" }, { status: 400 });
    }

    const payload = envelope.payload;
    if (!payload?.encryptionPublicKeyJwk || !payload?.signingPublicKeyJwk) {
      return Response.json({ status: false, reason: "Missing key payload" }, { status: 400 });
    }

    const expectedFingerprint = await computeFingerprintFromPublicKeys(
      payload.encryptionPublicKeyJwk,
      payload.signingPublicKeyJwk,
    );

    if (expectedFingerprint !== envelope.fingerprint) {
      return Response.json({ status: false, reason: "Fingerprint mismatch" }, { status: 400 });
    }

    const isValid = await verifyEnvelopeSignature(envelope, payload.signingPublicKeyJwk);
    if (!isValid) {
      return Response.json({ status: false, reason: "Invalid signature" }, { status: 401 });
    }

    try {
      await enforceFreshNonce(envelope.fingerprint, envelope.nonce, envelope.action, envelope.timestamp);
    } catch {
      return Response.json({ status: false, reason: "Replay or stale request" }, { status: 409 });
    }

    await upsertIdentity({
      fingerprint: envelope.fingerprint,
      encryptionPublicKeyJwk: payload.encryptionPublicKeyJwk,
      signingPublicKeyJwk: payload.signingPublicKeyJwk,
      createdAt: new Date(),
    });

    return Response.json({
      status: true,
      fingerprint: envelope.fingerprint,
      reason: "Identity registered",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "Invalid request" }, { status: 400 });
  }
}
