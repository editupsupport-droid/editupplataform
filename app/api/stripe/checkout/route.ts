import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { planMeets } from "@/lib/app-data"
import { enforceRateLimit, ensureTrustedOrigin } from "@/lib/security"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { getStripe, stripePrices } from "@/lib/stripe"

export const runtime = "nodejs"

const checkoutSchema = z.object({
  plan: z.enum(["starter", "essential"]),
})

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "stripe-checkout:post", max: 20 })
    if (rateLimitError) return rateLimitError

    const { user } = await requireAuthenticatedUser(request)
    const { plan } = checkoutSchema.parse(await request.json())
    const userId = user.id
    const email = user.email ?? ""

    const priceId = stripePrices[plan]

    if (!priceId) {
      return NextResponse.json({ error: "Plano Stripe não configurado." }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 })
    }

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=plan&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    )

    const profiles = (await profileResponse.json().catch(() => [])) as Array<{ plan?: "free" | "starter" | "essential" }>
    const currentPlan = profiles[0]?.plan ?? "free"

    if (planMeets(currentPlan, plan)) {
      return NextResponse.json({ error: "Esse plano ja esta liberado para sua conta." }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: plan === "starter" ? "payment" : "subscription",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        plan,
        userId,
      },
      success_url: `${request.nextUrl.origin}/dashboard/planos?checkout=success`,
      cancel_url: `${request.nextUrl.origin}/dashboard/planos?checkout=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Plano inválido." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao criar checkout."
    return NextResponse.json({ error: message === "Não autenticado." ? message : "Erro ao criar checkout." }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
