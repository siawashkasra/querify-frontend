import type { Metadata } from "next"
import ForgotPasswordForm from "@/components/website/auth/ForgotPasswordForm"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Forgot password — Querify",
  description: "Reset your Querify account password securely.",
  path: "/forgot-password",
})

export default function ForgotPasswordPage() {
  return (
    <div className="px-4 py-12 md:py-20">
      <ForgotPasswordForm />
    </div>
  )
}
