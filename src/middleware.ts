import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { decrypt } from "./utils/session";

export async function middleware(request: NextRequest) {
  console.log("Middleware running");
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  try {
    const payload: any = await decrypt(session?.value);
    if (!payload) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    const expiresAt = new Date(payload?.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (error) {
    console.log(error);
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|images|_next/public|public|favicon.ico|sitemap.xml|robots.txt|auth|404).*)",
  ],
};
