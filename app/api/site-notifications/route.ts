import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { readEditUpState, writeEditUpState } from "@/lib/editup-state"
import { enforceApiRateLimit, ensureSameOrigin, requireAdminAuthenticatedUser, sanitizePlainText } from "@/lib/api-admin"

export const runtime = "nodejs"

const ADMIN_EMAIL = "morinhajose1103@gmail.com"
const notificationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1000),
})

export async function GET() {
  const state = await readEditUpState()
  return NextResponse.json({ notifications: state.broadcasts.slice(0, 20) })
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureSameOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceApiRateLimit(request, "site-notifications:post", 20)
    if (rateLimitError) return rateLimitError

    const { user } = await requireAdminAuthenticatedUser(request)
    const email = user.email?.trim().toLowerCase() ?? ""

    if (email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "You are not allowed to send site-wide notifications." }, { status: 403 })
    }

    const body = notificationSchema.parse(await request.json().catch(() => ({})))
    const title = sanitizePlainText(body.title)
    const message = sanitizePlainText(body.message)

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 })
    }

    const state = await readEditUpState()
    state.broadcasts.unshift({
      id: crypto.randomUUID(),
      title,
      message,
      createdAt: new Date().toISOString(),
      createdBy: email,
    })
    state.broadcasts = state.broadcasts.slice(0, 50)
    await writeEditUpState(state)

    return NextResponse.json({ success: true, notifications: state.broadcasts.slice(0, 20) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 })
    }
    return NextResponse.json({ error: "Could not send notification." }, { status: 500 })
  }
}
