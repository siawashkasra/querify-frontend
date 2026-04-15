import type { Metadata } from "next"
import LoginForm from "@/components/website/auth/LoginForm"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Log in — Querify",
  description: "Sign in to Querify to connect your database and ask questions in plain English.",
  path: "/login",
})

export default function LoginPage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <LoginForm />
    </div>
  )
}
