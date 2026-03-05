import {
  enforceFreshNonce,
  getIdentity,
  listSecretsByFingerprint,
  verifyEnvelopeSignature,
} from "@/lib/vault/server";
import type { ListSecretsPayload, SignedEnvelope } from "@/lib/vault/types";

export async function POST(request: Request) {
  try {
    const envelope = (await request.json()) as SignedEnvelope<ListSecretsPayload>;

    if (envelope.action !== "list-secrets") {
      return Response.json({ status: false, reason: "Invalid action" }, { status: 400 });
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

    const entryType = envelope.payload.entryType;
    const contentKind = envelope.payload.contentKind;
    const secrets = await listSecretsByFingerprint(envelope.fingerprint, {
      project: envelope.payload.project,
      entryType: entryType && entryType !== "all" ? entryType : undefined,
      contentKind: contentKind && contentKind !== "all" ? contentKind : undefined,
      search: envelope.payload.search,
      page: envelope.payload.page,
      pageSize: envelope.payload.pageSize,
    });

    return Response.json({
      status: true,
      secrets: secrets.records.map((secret) => ({
        secretId: secret.secretId,
        title: secret.title,
        project: secret.project,
        entryType: secret.entryType,
        contentKind: secret.contentKind,
        keyName: secret.keyName,
        encryptedSymmetricKey: secret.encryptedSymmetricKey,
        iv: secret.iv,
        ciphertext: envelope.payload.includeCiphertext ? secret.ciphertext : undefined,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      })),
      total: secrets.total,
      page: secrets.page,
      pageSize: secrets.pageSize,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "Invalid request" }, { status: 400 });
  }
}
