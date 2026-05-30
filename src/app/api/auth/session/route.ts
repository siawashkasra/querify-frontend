import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const COOKIE_NAME = "qrf_session"
const THIRTY_DAYS = 60 * 60 * 24 * 30

// POST /api/auth/session — set the httpOnly session marker after login
export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  })
  return NextResponse.json({ ok: true })
}

// DELETE /api/auth/session — clear the session cookie on logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return NextResponse.json({ ok: true })
}
