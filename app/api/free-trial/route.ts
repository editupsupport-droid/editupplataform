import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getFreeTrialStatus, readEditUpState, writeEditUpState } from "@/lib/editup-state"
import { enforceRateLimit, ensureTrustedOrigin } from "@/lib/security"

export const runtime = "nodejs"

export async function GET() {
  const state = await readEditUpState()
  return NextResponse.json(getFreeTrialStatus(state.freeTrialClaimedEmails.length))
}

const schema = z.object({
  email: z.string().trim().email(),
})

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "free-trial:post", max: 30 })
    if (rateLimitError) return rateLimitError

    const { email } = schema.parse(await request.json().catch(() => ({})))
    const normalizedEmail = email.toLowerCase()

    const state = await readEditUpState()

    if (!state.freeTrialClaimedEmails.includes(normalizedEmail)) {
      state.freeTrialClaimedEmails.push(normalizedEmail)
      await writeEditUpState(state)
    }

    return NextResponse.json(getFreeTrialStatus(state.freeTrialClaimedEmails.length))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }
    return NextResponse.json({ error: "Could not update free trial status." }, { status: 500 })
  }
}
