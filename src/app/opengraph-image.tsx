import { ImageResponse } from "next/og"
import OgImageElement from "@/components/seo/OgImageElement"

export const runtime = "edge"
export const alt = "Querify — Ask your database anything"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(<OgImageElement />, { ...size })
}
