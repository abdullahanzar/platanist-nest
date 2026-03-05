import {
  enforceFreshNonce,
  getIdentity,
  upsertSecret,
  verifyEnvelopeSignature,
} from "@/lib/vault/server";
import type { CreateSecretPayload, SignedEnvelope } from "@/lib/vault/types";

export async function POST(request: Request) {
  try {
    const envelope = (await request.json()) as SignedEnvelope<CreateSecretPayload>;

    if (envelope.action !== "create-secret") {
      return Response.json({ status: false, reason: "Invalid action" }, { status: 400 });
    }

    const payload = envelope.payload;
    if (
      !payload?.secretId ||
      !payload?.title ||
      !payload?.encryptedSymmetricKey ||
      !payload?.iv ||
      !payload?.ciphertext
    ) {
      return Response.json({ status: false, reason: "Missing payload fields" }, { status: 400 });
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

    const now = new Date();
    await upsertSecret({
      secretId: payload.secretId,
      fingerprint: envelope.fingerprint,
      title: payload.title,
      project: payload.project,
      entryType: payload.entryType,
      keyName: payload.keyName,
      encryptedSymmetricKey: payload.encryptedSymmetricKey,
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ status: true, reason: "Secret stored", secretId: payload.secretId });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "Invalid request" }, { status: 400 });
  }
}
