import {
  enforceFreshNonce,
  getIdentity,
  upsertSecretsBatch,
  verifyEnvelopeSignature,
} from "@/lib/vault/server";
import type { CreateSecretsBatchPayload, SignedEnvelope } from "@/lib/vault/types";

const MAX_BATCH_SIZE = 100;

export async function POST(request: Request) {
  try {
    const envelope = (await request.json()) as SignedEnvelope<CreateSecretsBatchPayload>;

    if (envelope.action !== "create-secrets-batch") {
      return Response.json({ status: false, reason: "Invalid action" }, { status: 400 });
    }

    const records = envelope.payload?.records;
    if (!Array.isArray(records) || records.length === 0) {
      return Response.json({ status: false, reason: "records is required" }, { status: 400 });
    }

    if (records.length > MAX_BATCH_SIZE) {
      return Response.json(
        { status: false, reason: `Batch too large. Max ${MAX_BATCH_SIZE} records.` },
        { status: 400 },
      );
    }

    const seenIds = new Set<string>();
    for (const item of records) {
      if (
        !item?.secretId ||
        !item?.title ||
        !item?.encryptedSymmetricKey ||
        !item?.iv ||
        !item?.ciphertext
      ) {
        return Response.json({ status: false, reason: "Missing payload fields" }, { status: 400 });
      }

      if (seenIds.has(item.secretId)) {
        return Response.json({ status: false, reason: "Duplicate secretId in batch" }, { status: 400 });
      }
      seenIds.add(item.secretId);
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
    await upsertSecretsBatch(
      records.map((item) => ({
        secretId: item.secretId,
        fingerprint: envelope.fingerprint,
        title: item.title,
        project: item.project,
        entryType: item.entryType,
        contentKind: item.contentKind,
        keyName: item.keyName,
        encryptedSymmetricKey: item.encryptedSymmetricKey,
        iv: item.iv,
        ciphertext: item.ciphertext,
        createdAt: now,
        updatedAt: now,
      })),
    );

    return Response.json({
      status: true,
      reason: "Batch stored",
      count: records.length,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "Invalid request" }, { status: 400 });
  }
}