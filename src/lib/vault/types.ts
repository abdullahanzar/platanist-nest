export type VaultAction = "register" | "create-secret" | "list-secrets" | "delete-secret";

export interface IdentityDocument {
  fingerprint: string;
  encryptionPublicKeyJwk: JsonWebKey;
  signingPublicKeyJwk: JsonWebKey;
  createdAt: Date;
}

export interface VaultSecretDocument {
  secretId: string;
  fingerprint: string;
  title: string;
  encryptedSymmetricKey: string;
  iv: string;
  ciphertext: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignedEnvelope<TPayload> {
  fingerprint: string;
  timestamp: number;
  nonce: string;
  action: VaultAction;
  payload: TPayload;
  signature: string;
}

export interface RegisterPayload {
  encryptionPublicKeyJwk: JsonWebKey;
  signingPublicKeyJwk: JsonWebKey;
}

export interface CreateSecretPayload {
  secretId: string;
  title: string;
  encryptedSymmetricKey: string;
  iv: string;
  ciphertext: string;
}

export interface ListSecretsPayload {
  includeCiphertext: boolean;
}

export interface DeleteSecretPayload {
  secretId: string;
}
