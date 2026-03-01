import { mongoDB as getDb } from "@/utils/connection";
import { getBearerToken, verifyCliToken } from "@/utils/cli-auth";

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ status: false, reason: "missing bearer token" }, { status: 401 });
    }

    const claims = await verifyCliToken(token);
    if (!claims) {
      return Response.json({ status: false, reason: "invalid bearer token" }, { status: 401 });
    }

    const db = await getDb();
    const keys = db.collection("nest_cli_keys");
    await keys.createIndex({ userId: 1, keyId: 1 }, { unique: true });

    const rows = await keys
      .find({ userId: claims.userId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json({ status: true, keys: rows });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "invalid request" }, { status: 400 });
  }
}
