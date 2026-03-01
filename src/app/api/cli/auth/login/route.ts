import { mongoDB as getDb } from "@/utils/connection";
import { issueCliToken } from "@/utils/cli-auth";

export async function POST(request: Request) {
  try {
    const { email, apiKey } = await request.json();
    if (!email || !apiKey) {
      return Response.json({ status: false, reason: "email and apiKey are required" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("core-users").findOne({ email, apiKey });

    if (!user?._id) {
      return Response.json({ status: false, reason: "invalid credentials" }, { status: 401 });
    }

    const token = await issueCliToken(user._id.toString(), email);

    return Response.json({
      status: true,
      token,
      tokenType: "Bearer",
      expiresInSeconds: 900,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ status: false, reason: "invalid request" }, { status: 400 });
  }
}
