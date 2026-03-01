import { mongoDB as getDb } from "@/utils/connection";
import { getBearerToken, verifyCliToken } from "@/utils/cli-auth";
import { nextSecretVersion, validatePushPayload } from "@/lib/cli/policy";

type PushBody = {
  origin?: string;
  application?: string;
  envelope?: string;
  profile?: string;
  key_id?: string;
  fingerprint?: string;
  checksum_sha256?: string;
  content_bytes?: number;
};

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ status: false, reason: "missing bearer token" }, { status: 401 });
    }

    const claims = await verifyCliToken(token);
    if (!claims) {
      return Response.json({ status: false, reason: "invalid bearer token" }, { status: 401 });
    }

    const body = (await request.json()) as PushBody;
    const payloadCheck = validatePushPayload(body);
    if (!payloadCheck.ok) {
      return Response.json({ status: false, reason: payloadCheck.reason }, { status: 400 });
    }

    const db = await getDb();
    const secrets = db.collection("nest_cli_secrets");
    const audit = db.collection("nest_cli_audit");
    const keys = db.collection("nest_cli_keys");

    await secrets.createIndex({ userId: 1, origin: 1, application: 1, version: -1 });
    await secrets.createIndex(
      { userId: 1, origin: 1, application: 1, version: 1 },
      { unique: true }
    );
    await audit.createIndex({ userId: 1, createdAt: -1 });
    await keys.createIndex({ userId: 1, keyId: 1 }, { unique: true });

    const latest = await secrets.findOne(
      {
        userId: claims.userId,
        origin: body.origin,
        application: body.application,
      },
      { sort: { version: -1 } }
    );

    const version = nextSecretVersion(latest);
    const now = new Date();

    await keys.updateOne(
      { userId: claims.userId, keyId: body.key_id },
      {
        $setOnInsert: {
          createdAt: now,
        },
        $set: {
          email: claims.email,
          profile: body.profile,
          fingerprint: body.fingerprint,
          publicKey: null,
          lastUsedAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await secrets.insertOne({
      userId: claims.userId,
      email: claims.email,
      origin: body.origin,
      application: body.application,
      version,
      envelope: body.envelope,
      profile: body.profile,
      keyId: body.key_id,
      fingerprint: body.fingerprint,
      checksumSha256: body.checksum_sha256,
      contentBytes: body.content_bytes,
      createdAt: now,
    });

    await audit.insertOne({
      userId: claims.userId,
      email: claims.email,
      action: "ENV_PUSH",
      origin: body.origin,
      application: body.application,
      version,
      keyId: body.key_id,
      fingerprint: body.fingerprint,
      status: "SUCCESS",
      createdAt: now,
    });

    return Response.json({ status: true, version });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "invalid request" }, { status: 400 });
  }
}
