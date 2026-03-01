import { mongoDB as getDb } from "@/utils/connection";
import { getBearerToken, verifyCliToken } from "@/utils/cli-auth";
import { validatePullKeyFingerprintMatch, validatePullPayload } from "@/lib/cli/policy";

type PullBody = {
  origin?: string;
  application?: string;
  key_id?: string;
  fingerprint?: string;
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

    const body = (await request.json()) as PullBody;
    const payloadCheck = validatePullPayload(body);
    if (!payloadCheck.ok) {
      return Response.json({ status: false, reason: payloadCheck.reason }, { status: 400 });
    }

    const db = await getDb();
    const secrets = db.collection("nest_cli_secrets");
    const audit = db.collection("nest_cli_audit");
    await secrets.createIndex({ userId: 1, origin: 1, application: 1, version: -1 });
    await audit.createIndex({ userId: 1, createdAt: -1 });

    const latest = await secrets.findOne(
      {
        userId: claims.userId,
        origin: body.origin,
        application: body.application,
      },
      { sort: { version: -1 } }
    );

    const matchCheck = validatePullKeyFingerprintMatch(latest, body.key_id, body.fingerprint);
    if (!matchCheck.ok) {
      return Response.json(matchCheck.body, { status: matchCheck.status });
    }

    if (!latest) {
      return Response.json({ status: false, reason: "no secret found for origin/application" }, { status: 404 });
    }

    await audit.insertOne({
      userId: claims.userId,
      email: claims.email,
      action: "ENV_PULL",
      origin: body.origin,
      application: body.application,
      version: latest.version,
      keyId: latest.keyId,
      fingerprint: latest.fingerprint,
      status: "SUCCESS",
      createdAt: new Date(),
    });

    return Response.json({
      status: true,
      envelope: latest.envelope,
      version: latest.version,
      key_id: latest.keyId,
      profile: latest.profile,
      fingerprint: latest.fingerprint,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "invalid request" }, { status: 400 });
  }
}
