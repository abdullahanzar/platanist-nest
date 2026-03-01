import test from "node:test";
import assert from "node:assert/strict";

import {
  nextSecretVersion,
  validatePullKeyFingerprintMatch,
  validatePullPayload,
  validatePushPayload,
} from "./policy.js";

test("validatePushPayload rejects missing fields", () => {
  const result = validatePushPayload({ origin: "origin", application: "app" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing required payload fields");
});

test("validatePushPayload accepts complete payload", () => {
  const result = validatePushPayload({
    origin: "origin",
    application: "app",
    envelope: "abc",
    profile: "modern",
    key_id: "k1",
    fingerprint: "fp1",
    checksum_sha256: "sum",
    content_bytes: 123,
  });
  assert.equal(result.ok, true);
});

test("validatePullPayload rejects missing identity", () => {
  const result = validatePullPayload({ origin: "origin", application: "app" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /key_id and fingerprint/);
});

test("validatePullKeyFingerprintMatch handles not found", () => {
  const result = validatePullKeyFingerprintMatch(null, "k1", "fp1");
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test("validatePullKeyFingerprintMatch handles key mismatch", () => {
  const result = validatePullKeyFingerprintMatch({ keyId: "k-right", fingerprint: "fp" }, "k-wrong", "fp");
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.body.reason, "key mismatch for origin/application");
});

test("validatePullKeyFingerprintMatch handles fingerprint mismatch", () => {
  const result = validatePullKeyFingerprintMatch({ keyId: "k1", fingerprint: "fp-right" }, "k1", "fp-wrong");
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.body.reason, "fingerprint mismatch for origin/application");
});

test("validatePullKeyFingerprintMatch passes when matched", () => {
  const result = validatePullKeyFingerprintMatch({ keyId: "k1", fingerprint: "fp1" }, "k1", "fp1");
  assert.equal(result.ok, true);
});

test("nextSecretVersion computes increment", () => {
  assert.equal(nextSecretVersion(undefined), 1);
  assert.equal(nextSecretVersion({ version: 3 }), 4);
});
