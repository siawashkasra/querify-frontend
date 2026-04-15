import { ImageResponse } from "next/og"
import OgImageElement from "@/components/seo/OgImageElement"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(<OgImageElement />, { width: 1200, height: 630 })
}
