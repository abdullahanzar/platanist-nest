import {
  deleteSecretByFingerprint,
  enforceFreshNonce,
  getIdentity,
  verifyEnvelopeSignature,
} from "@/lib/vault/server";
import type { DeleteSecretPayload, SignedEnvelope } from "@/lib/vault/types";

export async function POST(request: Request) {
  try {
    const envelope = (await request.json()) as SignedEnvelope<DeleteSecretPayload>;

    if (envelope.action !== "delete-secret") {
      return Response.json({ status: false, reason: "Invalid action" }, { status: 400 });
    }

    const payload = envelope.payload;
    if (!payload?.secretId) {
      return Response.json({ status: false, reason: "Missing secretId" }, { status: 400 });
    }

    const identity = await getIdentity(envelope.fingerprint);
    if (!identity) {
      return Response.json({ status: false, reason: "Unknown fingerprint" }, { status: 404 });
    }

    const isValid = await verifyEnvelopeSignature(envelope, identity.signingPublicKeyJwk);
    if (!isValid) {
      return Response.json({ status: false, reason: "Invalid signature" }, { status: 401 });
    }

    try {
      await enforceFreshNonce(envelope.fingerprint, envelope.nonce, envelope.action, envelope.timestamp);
    } catch {
      return Response.json({ status: false, reason: "Replay or stale request" }, { status: 409 });
    }

    const deleted = await deleteSecretByFingerprint(envelope.fingerprint, payload.secretId);
    return Response.json({
      status: deleted,
      reason: deleted ? "Secret deleted" : "Secret not found",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "Invalid request" }, { status: 400 });
  }
}
