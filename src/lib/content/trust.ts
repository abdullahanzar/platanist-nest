export const securityGuarantees = [
  "Private key material stays in the browser and is never intentionally uploaded.",
  "Secret plaintext is encrypted locally before upload.",
  "Server stores ciphertext, encrypted symmetric key, iv, and metadata only.",
  "Requests are signed and include fingerprint + nonce + timestamp.",
  "Replay and stale request attempts are rejected server-side.",
];

export const transparencyPoints = [
  "All core logic is inspectable in source code.",
  "Security claims can be verified against implementation details.",
  "Any user can audit, fork, and self-host based on their own trust model.",
  "Open issue and PR history creates a public record of changes over time.",
];

export const inspectChecklist = [
  "Client-side encryption flow in `src/lib/vault/client.ts`.",
  "Server verification and nonce/replay protections in `src/lib/vault/server.ts`.",
  "Vault API routes under `src/app/api/vault/**`.",
  "CLI policy checks in `src/lib/cli/policy.js`.",
  "Route-level UX behavior in `src/components/keys/symmetric-key-generator.tsx`.",
];

export const quickStartSteps = [
  "Go to Onboarding and choose Create New Vault.",
  "Generate your key bundle in-browser.",
  "Set a backup passphrase and download your encrypted bundle file.",
  "Activate your key once.",
  "Save your first secret using Save and Encrypt.",
];

export const selfHostHighlights = [
  "Self-host the API and data backend to align with your own trust boundary.",
  "Fork and audit the full codebase before deployment.",
  "Use `nest-cli` to keep encrypted workflows in your existing CI/CD and ops stack.",
  "Run your own MongoDB instance and key-management process for full control.",
];
