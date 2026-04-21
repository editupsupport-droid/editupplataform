import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { planMeets, type PlanId } from "@/lib/app-data"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe não configurado." }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (
      event.type === "checkout.session.completed" ||
      event.type === "invoice.payment_succeeded"
    ) {
      const session = event.data.object
      const userId =
        "metadata" in session && session.metadata ? session.metadata.userId : undefined
      const plan =
        "metadata" in session && session.metadata ? session.metadata.plan : undefined

      if (userId && plan) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (supabaseUrl && serviceRoleKey) {
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
          const profiles = (await profileResponse.json().catch(() => [])) as Array<{ plan?: PlanId }>
          const currentPlan = profiles[0]?.plan ?? "free"
          const nextPlan = planMeets(currentPlan, plan as PlanId) ? currentPlan : (plan as PlanId)

          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ plan: nextPlan }),
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no webhook."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
