import { mongoDB as getDb } from "@/utils/connection";
import { createSession } from "@/utils/session";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { transporter } from "@/utils/transporter";

export async function POST(request: Request) {
  try {
    const { name, email, password, userOTP } = await request.json();
    const db = await getDb();
    try {
      const userDetails = await db.collection("core-users").findOne({
        email,
      });
      if (userDetails) {
        await transporter.sendMail({
          from: `"Nest" <${process.env.SMTP_USER}> `,
          to: email,
          subject: "Account Creation Attempt Detected",
          text: `We can see you are attempting to create an account on Nest. As your account already exists, please login or reset your password here. If this wasn't you, please ignore this email.`,
        });
        return Response.json({
          status: false,
          reason: "Check your email please.",
        });
      }
    } catch (e) {
      console.log(e);
    }
    try {
      if (userOTP) {
        const exists = await db.collection("temp").findOne({
          otp: userOTP,
        });
        if (exists?.otp) {
          const apiKey = uuidv4();
          const encryptedPassword = await bcrypt.hash(password, 3);
          const userDetails = await db
            .collection("core-users")
            .findOneAndUpdate(
              { email },
              {
                $setOnInsert: {
                  name,
                  email,
                  verified: {
                    email: true,
                  },
                  createdAt: new Date(),
                  apiKey,
                  password: encryptedPassword,
                },
              },
              {
                upsert: true,
                returnDocument: "after",
              }
            );
            db.collection("temp").deleteOne({ otp: userOTP });
          if (userDetails?._id) {
            await createSession(userDetails?._id.toString()!);
          }
          return Response.json({ status: true, user: userDetails, firstTime: true });
        } else {
          return Response.json({
            status: false,
            reason: "Incorrect OTP",
          })
        }
      }
      const otp =
        Math.random().toString(36).substring(2, 4).toUpperCase() +
        Math.floor(10000 + Math.random() * 9000).toString();
      await db.collection("temp").insertOne({
        createdAt: new Date(),
        otp,
      });
      await transporter.sendMail({
        from: `"Nest" <${process.env.SMTP_USER}> `,
        to: email,
        subject: "Email Verification",
        text: `Please enter the following OTP to create your account: ${otp}`,
      });
      return Response.json({
        status: false,
        reason: "verification",
      });
    } catch (e) {
      console.log(e);
    }
  } catch (e) {
    console.log(e);
    return Response.json({ status: false, reason: `error, ${e}`, user: null });
  }
}
