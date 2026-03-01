import { mongoDB as getDb } from "@/utils/connection";
import { getBearerToken, verifyCliToken } from "@/utils/cli-auth";

type RegisterKeyBody = {
  key_id?: string;
  profile?: string;
  fingerprint?: string;
  public_key?: string;
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

    const body = (await request.json()) as RegisterKeyBody;
    if (!body.key_id || !body.profile || !body.fingerprint || !body.public_key) {
      return Response.json(
        { status: false, reason: "key_id, profile, fingerprint and public_key are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const keys = db.collection("nest_cli_keys");
    const now = new Date();

    await keys.createIndex({ userId: 1, keyId: 1 }, { unique: true });
    await keys.createIndex({ userId: 1, fingerprint: 1 }, { unique: true });

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
          publicKey: body.public_key,
          updatedAt: now,
          revokedAt: null,
        },
      },
      { upsert: true }
    );

    return Response.json({ status: true, reason: "key registered" });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "invalid request" }, { status: 400 });
  }
}
