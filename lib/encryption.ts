import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const IV_LENGTH = 12

const getEncryptionKey = () => {
  const raw = process.env.APP_ENCRYPTION_KEY

  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY não foi configurada.")
  }

  return createHash("sha256").update(raw).digest()
}

export const encryptValue = (plainText: string) => {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export const decryptValue = (encodedValue: string) => {
  const buffer = Buffer.from(encodedValue, "base64")
  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16)
  const encrypted = buffer.subarray(IV_LENGTH + 16)
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
