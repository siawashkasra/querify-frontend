import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Protected (app) routes — all paths that require authentication
const PROTECTED_PATHS = [
  "/dashboard",
  "/chat",
  "/settings",
  "/history",
  "/insights",
  "/audit-log",
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  // Optimistic session check — set by /api/auth/session on login
  const session = request.cookies.get("qrf_session")
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run proxy on all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon, robots, sitemap (static metadata)
     * - /api routes (Route Handlers handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/).*)",
  ],
}
