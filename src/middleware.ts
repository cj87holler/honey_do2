import { NextRequest, NextResponse } from "next/server"

const protectedPaths = ["/hive"]
const authPaths = ["/login", "/signup"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Better Auth uses "__Secure-" prefix on HTTPS (production)
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token")

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

  if (!sessionToken && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/hive", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
