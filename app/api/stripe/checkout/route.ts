import { NextRequest, NextResponse } from "next/server"
import { getStripe, stripePrices } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, email, userId } = body as {
      plan: "starter" | "essential"
      email: string
      userId: string
    }

    const priceId = stripePrices[plan]

    if (!priceId) {
      return NextResponse.json({ error: "Plano Stripe não configurado." }, { status: 400 })
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
    const message = error instanceof Error ? error.message : "Erro ao criar checkout."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
