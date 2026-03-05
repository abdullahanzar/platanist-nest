import type {
  CreateSecretsBatchPayload,
  CreateSecretPayload,
  DeleteSecretPayload,
  ListSecretsPayload,
  RegisterPayload,
  SignedEnvelope,
  VaultAction,
} from "@/lib/vault/types";
import { canonicalize } from "@/lib/vault/canonical";

export interface VaultKeyBundle {
  version: 1;
  fingerprint: string;
  createdAt: string;
  encryptionPublicKeyJwk: JsonWebKey;
  encryptionPrivateKeyJwk: JsonWebKey;
  signingPublicKeyJwk: JsonWebKey;
  signingPrivateKeyJwk: JsonWebKey;
}

export interface ImportedVaultKeys {
  fingerprint: string;
  encryptionPublicKeyJwk: JsonWebKey;
  signingPublicKeyJwk: JsonWebKey;
  encryptionPublicKey: CryptoKey;
  encryptionPrivateKey: CryptoKey;
  signingPrivateKey: CryptoKey;
}

export interface EncryptedSecret {
  encryptedSymmetricKey: string;
  iv: string;
  ciphertext: string;
}

interface EncryptedVaultBundleFile {
  schema: "platanist-vault-encrypted-bundle";
  version: 1;
  fingerprint: string;
  createdAt: string;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt: string;
  };
  cipher: {
    name: "AES-GCM";
    iv: string;
  };
  ciphertext: string;
}

const BUNDLE_KDF_ITERATIONS = 250000;

function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function exportFingerprint(
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

export async function generateVaultKeyBundle(): Promise<VaultKeyBundle> {
  const encryptionKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  const signingKeyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"],
  );

  const encryptionPublicKeyJwk = await crypto.subtle.exportKey("jwk", encryptionKeyPair.publicKey);
  const encryptionPrivateKeyJwk = await crypto.subtle.exportKey("jwk", encryptionKeyPair.privateKey);
  const signingPublicKeyJwk = await crypto.subtle.exportKey("jwk", signingKeyPair.publicKey);
  const signingPrivateKeyJwk = await crypto.subtle.exportKey("jwk", signingKeyPair.privateKey);

  const fingerprint = await exportFingerprint(encryptionPublicKeyJwk, signingPublicKeyJwk);

  return {
    version: 1,
    fingerprint,
    createdAt: new Date().toISOString(),
    encryptionPublicKeyJwk,
    encryptionPrivateKeyJwk,
    signingPublicKeyJwk,
    signingPrivateKeyJwk,
  };
}

export async function importVaultBundle(bundle: VaultKeyBundle): Promise<ImportedVaultKeys> {
  if (bundle.version !== 1) {
    throw new Error("Unsupported key bundle version");
  }

  const expectedFingerprint = await exportFingerprint(
    bundle.encryptionPublicKeyJwk,
    bundle.signingPublicKeyJwk,
  );

  if (expectedFingerprint !== bundle.fingerprint) {
    throw new Error("Key bundle fingerprint mismatch");
  }

  const encryptionPublicKey = await crypto.subtle.importKey(
    "jwk",
    bundle.encryptionPublicKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  );

  const encryptionPrivateKey = await crypto.subtle.importKey(
    "jwk",
    bundle.encryptionPrivateKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"],
  );

  const signingPrivateKey = await crypto.subtle.importKey(
    "jwk",
    bundle.signingPrivateKeyJwk,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign"],
  );

  return {
    fingerprint: bundle.fingerprint,
    encryptionPublicKeyJwk: bundle.encryptionPublicKeyJwk,
    signingPublicKeyJwk: bundle.signingPublicKeyJwk,
    encryptionPublicKey,
    encryptionPrivateKey,
    signingPrivateKey,
  };
}

function ensurePassphrase(passphrase: string): void {
  if (passphrase.length < 10) {
    throw new Error("Passphrase must be at least 10 characters");
  }
}

async function deriveAesKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: BUNDLE_KDF_ITERATIONS,
      salt,
    },
    material,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    usages,
  );
}

async function encryptBundleWithPassphrase(
  bundle: VaultKeyBundle,
  passphrase: string,
): Promise<EncryptedVaultBundleFile> {
  ensurePassphrase(passphrase);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKeyFromPassphrase(passphrase, salt, ["encrypt"]);
  const payload = new TextEncoder().encode(JSON.stringify(bundle));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);

  return {
    schema: "platanist-vault-encrypted-bundle",
    version: 1,
    fingerprint: bundle.fingerprint,
    createdAt: new Date().toISOString(),
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: BUNDLE_KDF_ITERATIONS,
      salt: toBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: toBase64(iv),
    },
    ciphertext: toBase64(ciphertext),
  };
}

export async function parseVaultBundleFromFileText(
  fileText: string,
  passphrase: string,
): Promise<VaultKeyBundle> {
  const parsed = JSON.parse(fileText) as
    | EncryptedVaultBundleFile
    | VaultKeyBundle
    | Record<string, unknown>;

  if ((parsed as EncryptedVaultBundleFile).schema !== "platanist-vault-encrypted-bundle") {
    if ((parsed as VaultKeyBundle).version === 1 && (parsed as VaultKeyBundle).fingerprint) {
      throw new Error("Unencrypted legacy bundle is not supported. Generate a new protected bundle.");
    }
    throw new Error("Invalid bundle format");
  }

  const encrypted = parsed as EncryptedVaultBundleFile;
  ensurePassphrase(passphrase);

  const salt = fromBase64(encrypted.kdf.salt);
  const iv = fromBase64(encrypted.cipher.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);

  const key = await deriveAesKeyFromPassphrase(passphrase, salt, ["decrypt"]);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    throw new Error("Incorrect passphrase or corrupted bundle");
  }

  const bundle = JSON.parse(new TextDecoder().decode(plaintext)) as VaultKeyBundle;
  if (bundle.fingerprint !== encrypted.fingerprint) {
    throw new Error("Bundle integrity check failed");
  }

  return bundle;
}

export async function downloadBundle(bundle: VaultKeyBundle, passphrase: string): Promise<void> {
  const encrypted = await encryptBundleWithPassphrase(bundle, passphrase);
  const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `platanist-vault-${bundle.fingerprint.slice(0, 12)}.enc.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function encryptSecret(
  plaintext: string,
  encryptionPublicKey: CryptoKey,
): Promise<EncryptedSecret> {
  const symmetricKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const rawSymmetricKey = await crypto.subtle.exportKey("raw", symmetricKey);

  const encryptedSymmetricKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    encryptionPublicKey,
    rawSymmetricKey,
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    symmetricKey,
    new TextEncoder().encode(plaintext),
  );

  return {
    encryptedSymmetricKey: toBase64(encryptedSymmetricKey),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptSecret(
  encrypted: EncryptedSecret,
  encryptionPrivateKey: CryptoKey,
): Promise<string> {
  const rawSymmetricKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    encryptionPrivateKey,
    fromBase64(encrypted.encryptedSymmetricKey),
  );

  const symmetricKey = await crypto.subtle.importKey(
    "raw",
    rawSymmetricKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encrypted.iv),
    },
    symmetricKey,
    fromBase64(encrypted.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

async function signPayload(payload: string, signingPrivateKey: CryptoKey): Promise<string> {
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    signingPrivateKey,
    new TextEncoder().encode(payload),
  );

  return toBase64(signature);
}

export async function createSignedEnvelope<TPayload extends object>(
  action: VaultAction,
  payload: TPayload,
  importedKeys: ImportedVaultKeys,
): Promise<SignedEnvelope<TPayload>> {
  const envelopeWithoutSignature: Omit<SignedEnvelope<TPayload>, "signature"> = {
    fingerprint: importedKeys.fingerprint,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    action,
    payload,
  };

  const message = canonicalize(envelopeWithoutSignature);
  const signature = await signPayload(message, importedKeys.signingPrivateKey);

  return {
    ...envelopeWithoutSignature,
    signature,
  };
}

export function getRegisterPayload(importedKeys: ImportedVaultKeys): RegisterPayload {
  return {
    encryptionPublicKeyJwk: importedKeys.encryptionPublicKeyJwk,
    signingPublicKeyJwk: importedKeys.signingPublicKeyJwk,
  };
}

export function getCreatePayload(input: {
  secretId: string;
  title: string;
  project?: string;
  entryType?: "secret" | "note";
  contentKind?: "secret" | "note" | "env";
  keyName?: string;
  encryptedSymmetricKey: string;
  iv: string;
  ciphertext: string;
}): CreateSecretPayload {
  return {
    secretId: input.secretId,
    title: input.title,
    project: input.project,
    entryType: input.entryType,
    contentKind: input.contentKind,
    keyName: input.keyName,
    encryptedSymmetricKey: input.encryptedSymmetricKey,
    iv: input.iv,
    ciphertext: input.ciphertext,
  };
}

export function getBatchCreatePayload(records: CreateSecretPayload[]): CreateSecretsBatchPayload {
  return { records };
}

export function getListPayload(input?: {
  includeCiphertext?: boolean;
  project?: string;
  entryType?: "secret" | "note" | "all";
  contentKind?: "secret" | "note" | "env" | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}): ListSecretsPayload {
  return {
    includeCiphertext: input?.includeCiphertext ?? true,
    project: input?.project,
    entryType: input?.entryType,
    contentKind: input?.contentKind,
    search: input?.search,
    page: input?.page,
    pageSize: input?.pageSize,
  };
}

export function getDeletePayload(secretId: string): DeleteSecretPayload {
  return { secretId };
}
