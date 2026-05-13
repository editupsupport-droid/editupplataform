import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { planMeets, type PlanId } from "@/lib/app-data"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"

const getProfileMeta = (object: unknown) => {
  const item = object as {
    metadata?: Record<string, string>
    parent?: { subscription_details?: { metadata?: Record<string, string> } }
    subscription_details?: { metadata?: Record<string, string> }
  }
  return item.metadata ?? item.parent?.subscription_details?.metadata ?? item.subscription_details?.metadata ?? {}
}

const getRedeemWindow = () => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 3)
  return expiresAt.toISOString()
}

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
      event.type === "invoice.payment_succeeded" ||
      event.type === "invoice.payment_failed" ||
      event.type === "customer.subscription.deleted"
    ) {
      const session = event.data.object
      const metadata = getProfileMeta(session)
      const userId = metadata.userId
      const plan = metadata.plan

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
          const paymentFailed = event.type === "invoice.payment_failed" || event.type === "customer.subscription.deleted"
          const nextPlan = paymentFailed
            ? "free"
            : planMeets(currentPlan, plan as PlanId)
              ? currentPlan
              : (plan as PlanId)
          const subscriptionStatus =
            event.type === "invoice.payment_failed"
              ? "past_due"
              : event.type === "customer.subscription.deleted"
                ? "canceled"
                : "active"
          const patchPayload: Record<string, string> = {
            plan: nextPlan,
            subscription_tier: nextPlan === "pro" ? "pro" : nextPlan === "essential" ? "essential" : "starter",
            subscription_status: subscriptionStatus,
          }

          if (!paymentFailed && nextPlan === "pro") {
            patchPayload.creative_cloud_redeem_available_until = getRedeemWindow()
          }

          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(patchPayload),
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
