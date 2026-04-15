import Stripe from "stripe"

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
    })
  : null

export const getStripe = () => {
  if (!stripe) {
    throw new Error("Stripe ainda não foi configurado.")
  }

  return stripe
}

export const stripePrices = {
  starter: process.env.STRIPE_PRICE_STARTER,
  essential: process.env.STRIPE_PRICE_ESSENTIAL,
}

export const isStripeConfigured = Boolean(
  secretKey && stripePrices.starter && stripePrices.essential
)
