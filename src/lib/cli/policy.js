function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validatePushPayload(body) {
  if (
    !isNonEmptyString(body?.origin) ||
    !isNonEmptyString(body?.application) ||
    !isNonEmptyString(body?.envelope) ||
    !isNonEmptyString(body?.profile) ||
    !isNonEmptyString(body?.key_id) ||
    !isNonEmptyString(body?.fingerprint) ||
    !isNonEmptyString(body?.checksum_sha256) ||
    typeof body?.content_bytes !== "number"
  ) {
    return { ok: false, reason: "missing required payload fields" };
  }
  return { ok: true };
}

export function validatePullPayload(body) {
  if (
    !isNonEmptyString(body?.origin) ||
    !isNonEmptyString(body?.application) ||
    !isNonEmptyString(body?.key_id) ||
    !isNonEmptyString(body?.fingerprint)
  ) {
    return { ok: false, reason: "origin, application, key_id and fingerprint are required" };
  }
  return { ok: true };
}

export function nextSecretVersion(latest) {
  return typeof latest?.version === "number" ? latest.version + 1 : 1;
}

export function validatePullKeyFingerprintMatch(latest, keyID, fingerprint) {
  if (!latest) {
    return { ok: false, status: 404, body: { status: false, reason: "no secret found for origin/application" } };
  }

  if (latest.keyId !== keyID) {
    return {
      ok: false,
      status: 409,
      body: {
        status: false,
        reason: "key mismatch for origin/application",
        expectedKeyId: latest.keyId,
      },
    };
  }

  if (latest.fingerprint !== fingerprint) {
    return {
      ok: false,
      status: 409,
      body: {
        status: false,
        reason: "fingerprint mismatch for origin/application",
        expectedFingerprint: latest.fingerprint,
      },
    };
  }

  return { ok: true };
}
