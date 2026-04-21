import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

const TOKEN_BYTES = 32

export const createReviewToken = () => randomBytes(TOKEN_BYTES).toString("hex")

export const hashReviewToken = (token: string) => createHash("sha256").update(token).digest("hex")

export const isReviewTokenMatch = (token: string, expectedHash: string | null) => {
  if (!expectedHash || !token) return false

  const providedHash = hashReviewToken(token)
  const providedBuffer = Buffer.from(providedHash, "hex")
  const expectedBuffer = Buffer.from(expectedHash, "hex")

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export const createReviewExpiry = (hours = 24) => {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + hours)
  return expiresAt.toISOString()
}
