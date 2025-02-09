import { mongoDB as getDb } from "@/utils/connection";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { createSession } from "@/utils/session";
import { transporter } from "@/utils/transporter";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const db = await getDb();
    try {
      const userDetails = await db.collection("core-users").findOne({
        email,
      });
      if (userDetails) {
        const isCorrect = await bcrypt.compare(password, userDetails.password);
        if (isCorrect) {
          await createSession(userDetails?._id.toString());
          transporter.sendMail({
            to: email,
            subject: "Login Notification",
            text: `Hello, ${
              userDetails.name
            }! You have successfully logged in to your account at ${new Date().toLocaleString()} If this wasn't you, please reach out to abdullahanzar789@gmail.com or platanist@gmail.com urgently.`,
          });
          return Response.json({
            status: true,
            user: {
              ...userDetails,
              password: uuidv4(), //I just love to fuck with hackers. ;-)
            },
            firstTime: false,
          });
        }
        return Response.json({
          status: false,
          reason: "Incorrect Password",
        });
      } else {
        return Response.json({
          status: false,
          reason: "Incorrect Credentials",
        });
      }
    } catch (e) {
      console.log(e);
      return Response.json({
        status: false,
        reason: `error, ${e}`,
        user: null,
      });
    }
  } catch (e) {
    console.log(e);
    return Response.json({ status: false, reason: `error, ${e}`, user: null });
  }
}
