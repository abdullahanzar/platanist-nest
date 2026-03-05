export type VaultAction =
  | "register"
  | "create-secret"
  | "create-secrets-batch"
  | "list-secrets"
  | "delete-secret";

export type VaultEntryType = "secret" | "note";

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
  project?: string;
  entryType?: VaultEntryType;
  keyName?: string;
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
  project?: string;
  entryType?: VaultEntryType;
  keyName?: string;
  encryptedSymmetricKey: string;
  iv: string;
  ciphertext: string;
}

export interface CreateSecretsBatchPayload {
  records: CreateSecretPayload[];
}

export interface ListSecretsPayload {
  includeCiphertext: boolean;
  project?: string;
  entryType?: VaultEntryType | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DeleteSecretPayload {
  secretId: string;
}
