import { mongoDB } from "@/utils/connection";
import { canonicalize } from "@/lib/vault/canonical";
import type {
  IdentityDocument,
  SignedEnvelope,
  VaultAction,
  VaultSecretDocument,
} from "@/lib/vault/types";

const MAX_SKEW_MS = 5 * 60 * 1000;
const NONCE_TTL_SECONDS = 10 * 60;

export function buildSignableMessage<TPayload>(
  envelope: Omit<SignedEnvelope<TPayload>, "signature">,
): string {
  return canonicalize({
    fingerprint: envelope.fingerprint,
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    action: envelope.action,
    payload: envelope.payload,
  });
}

async function importSigningPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  if (jwk.kty === "EC") {
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  }

  if (jwk.kty === "RSA") {
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-PSS", hash: "SHA-256" },
      false,
      ["verify"],
    );
  }

  throw new Error("Unsupported signing key type");
}

export async function verifyEnvelopeSignature<TPayload>(
  envelope: SignedEnvelope<TPayload>,
  signingPublicKeyJwk: JsonWebKey,
): Promise<boolean> {
  const key = await importSigningPublicKey(signingPublicKeyJwk);
  const message = new TextEncoder().encode(
    buildSignableMessage({
      fingerprint: envelope.fingerprint,
      timestamp: envelope.timestamp,
      nonce: envelope.nonce,
      action: envelope.action,
      payload: envelope.payload,
    }),
  );
  const signature = Buffer.from(envelope.signature, "base64");

  if (signingPublicKeyJwk.kty === "EC") {
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, message);
  }

  return crypto.subtle.verify({ name: "RSA-PSS", saltLength: 32 }, key, signature, message);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Buffer.from(digest).toString("hex");
}

export async function computeFingerprintFromPublicKeys(
  encryptionPublicKeyJwk: JsonWebKey,
  signingPublicKeyJwk: JsonWebKey,
): Promise<string> {
  return sha256Hex(
    canonicalize({
      encryptionPublicKeyJwk,
      signingPublicKeyJwk,
      schema: "platanist-nest-vault-v1",
    }),
  );
}

export async function enforceFreshNonce(
  fingerprint: string,
  nonce: string,
  action: VaultAction,
  timestamp: number,
): Promise<void> {
  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_SKEW_MS) {
    throw new Error("Request timestamp is outside the allowed window");
  }

  const db = await mongoDB();
  const nonceCollection = db.collection("vault-nonces");
  await nonceCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await nonceCollection.createIndex({ fingerprint: 1, nonce: 1, action: 1 }, { unique: true });

  await nonceCollection.insertOne({
    fingerprint,
    nonce,
    action,
    createdAt: new Date(),
    expiresAt: new Date(now + NONCE_TTL_SECONDS * 1000),
  });
}

export async function getIdentity(fingerprint: string): Promise<IdentityDocument | null> {
  const db = await mongoDB();
  const identities = db.collection<IdentityDocument>("vault-identities");
  await identities.createIndex({ fingerprint: 1 }, { unique: true });

  return identities.findOne({ fingerprint });
}

export async function upsertIdentity(identity: IdentityDocument): Promise<void> {
  const db = await mongoDB();
  const identities = db.collection<IdentityDocument>("vault-identities");
  await identities.createIndex({ fingerprint: 1 }, { unique: true });

  await identities.updateOne(
    { fingerprint: identity.fingerprint },
    {
      $setOnInsert: {
        createdAt: identity.createdAt,
      },
      $set: {
        encryptionPublicKeyJwk: identity.encryptionPublicKeyJwk,
        signingPublicKeyJwk: identity.signingPublicKeyJwk,
      },
    },
    { upsert: true },
  );
}

export async function upsertSecret(secret: VaultSecretDocument): Promise<void> {
  const db = await mongoDB();
  const secrets = db.collection<VaultSecretDocument>("vault-secrets");
  await secrets.createIndex({ fingerprint: 1, secretId: 1 }, { unique: true });
  await secrets.createIndex({ fingerprint: 1, project: 1, updatedAt: -1 });
  await secrets.createIndex({ fingerprint: 1, entryType: 1, updatedAt: -1 });
  await secrets.createIndex({ fingerprint: 1, contentKind: 1, updatedAt: -1 });

  await secrets.updateOne(
    { fingerprint: secret.fingerprint, secretId: secret.secretId },
    {
      $set: {
        title: secret.title,
        project: secret.project,
        entryType: secret.entryType,
        contentKind: secret.contentKind,
        keyName: secret.keyName,
        encryptedSymmetricKey: secret.encryptedSymmetricKey,
        iv: secret.iv,
        ciphertext: secret.ciphertext,
        updatedAt: secret.updatedAt,
      },
      $setOnInsert: {
        createdAt: secret.createdAt,
      },
    },
    { upsert: true },
  );
}

export async function upsertSecretsBatch(secretsInput: VaultSecretDocument[]): Promise<void> {
  if (secretsInput.length === 0) {
    return;
  }

  const db = await mongoDB();
  const secrets = db.collection<VaultSecretDocument>("vault-secrets");
  await secrets.createIndex({ fingerprint: 1, secretId: 1 }, { unique: true });
  await secrets.createIndex({ fingerprint: 1, project: 1, updatedAt: -1 });
  await secrets.createIndex({ fingerprint: 1, entryType: 1, updatedAt: -1 });
  await secrets.createIndex({ fingerprint: 1, contentKind: 1, updatedAt: -1 });

  await secrets.bulkWrite(
    secretsInput.map((secret) => ({
      updateOne: {
        filter: { fingerprint: secret.fingerprint, secretId: secret.secretId },
        update: {
          $set: {
            title: secret.title,
            project: secret.project,
            entryType: secret.entryType,
            contentKind: secret.contentKind,
            keyName: secret.keyName,
            encryptedSymmetricKey: secret.encryptedSymmetricKey,
            iv: secret.iv,
            ciphertext: secret.ciphertext,
            updatedAt: secret.updatedAt,
          },
          $setOnInsert: {
            createdAt: secret.createdAt,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

export async function listSecretsByFingerprint(
  fingerprint: string,
  options?: {
    project?: string;
    entryType?: "secret" | "note";
    contentKind?: "secret" | "note" | "env";
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{ records: VaultSecretDocument[]; total: number; page: number; pageSize: number }> {
  const db = await mongoDB();
  const secrets = db.collection<VaultSecretDocument>("vault-secrets");
  await secrets.createIndex({ fingerprint: 1, secretId: 1 }, { unique: true });
  await secrets.createIndex({ fingerprint: 1, project: 1, updatedAt: -1 });
  await secrets.createIndex({ fingerprint: 1, entryType: 1, updatedAt: -1 });
  await secrets.createIndex({ fingerprint: 1, contentKind: 1, updatedAt: -1 });

  const queryParts: Record<string, unknown>[] = [{ fingerprint }];
  if (options?.project) {
    queryParts.push({ project: options.project });
  }
  if (options?.entryType) {
    queryParts.push({ entryType: options.entryType });
  }

  if (options?.contentKind) {
    if (options.contentKind === "secret") {
      queryParts.push({
        $or: [
          { contentKind: "secret" },
          { contentKind: { $exists: false }, entryType: "secret" },
        ],
      });
    } else if (options.contentKind === "note") {
      queryParts.push({
        $or: [
          { contentKind: "note" },
          { contentKind: { $exists: false }, entryType: "note" },
        ],
      });
    } else if (options.contentKind === "env") {
      const legacyEnvPattern = /(^|\W)(\.?env|dotenv)(\W|$)/i;
      queryParts.push({
        $or: [
          { contentKind: "env" },
          {
            contentKind: { $exists: false },
            entryType: "note",
            $or: [
              { title: { $regex: legacyEnvPattern } },
              { keyName: { $regex: legacyEnvPattern } },
            ],
          },
        ],
      });
    }
  }

  if (options?.search?.trim()) {
    const pattern = options.search.trim();
    queryParts.push({
      $or: [
        { title: { $regex: pattern, $options: "i" } },
        { keyName: { $regex: pattern, $options: "i" } },
        { project: { $regex: pattern, $options: "i" } },
      ],
    });
  }

  const query: Record<string, unknown> = queryParts.length === 1 ? queryParts[0] : { $and: queryParts };

  const pageSize = Math.min(Math.max(options?.pageSize ?? 50, 1), 200);
  const page = Math.max(options?.page ?? 1, 1);
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    secrets.find(query).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).toArray(),
    secrets.countDocuments(query),
  ]);

  return {
    records,
    total,
    page,
    pageSize,
  };
}

export async function deleteSecretByFingerprint(fingerprint: string, secretId: string): Promise<boolean> {
  const db = await mongoDB();
  const secrets = db.collection<VaultSecretDocument>("vault-secrets");
  const result = await secrets.deleteOne({ fingerprint, secretId });
  return result.deletedCount > 0;
}
