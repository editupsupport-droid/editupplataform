import { createHmac, randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"
import { decryptValue, encryptValue } from "@/lib/encryption"
import { getSiteUrl } from "@/lib/site-url"

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"

type DriveConnectionRow = {
  user_id: string
  encrypted_access_token: string
  encrypted_refresh_token: string
  token_expires_at: string | null
  scope: string
  drive_email: string | null
  created_at: string
  updated_at: string
}

export type DriveConnection = {
  userId: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt: string | null
  scope: string
  driveEmail: string | null
}

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não está configurado.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const getDriveOauthConfig = () => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI || `${getSiteUrl()}/api/google-drive/callback`

  if (!clientId || !clientSecret) {
    throw new Error("Google Drive OAuth não foi configurado.")
  }

  return { clientId, clientSecret, redirectUri }
}

const getStateSecret = () => process.env.APP_ENCRYPTION_KEY || "editup-drive-state"

const toRowConnection = (row: DriveConnectionRow): DriveConnection => ({
  userId: row.user_id,
  accessToken: decryptValue(row.encrypted_access_token),
  refreshToken: decryptValue(row.encrypted_refresh_token),
  tokenExpiresAt: row.token_expires_at,
  scope: row.scope,
  driveEmail: row.drive_email,
})

export const getGoogleOauthClient = () => {
  const { clientId, clientSecret, redirectUri } = getDriveOauthConfig()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export const encodeDriveState = (payload: { userId: string; returnTo?: string }) => {
  const serialized = JSON.stringify({
    ...payload,
    nonce: randomUUID(),
    issuedAt: Date.now(),
  })
  const encoded = Buffer.from(serialized, "utf8").toString("base64url")
  const signature = createHmac("sha256", getStateSecret()).update(encoded).digest("base64url")
  return `${encoded}.${signature}`
}

export const decodeDriveState = (rawState: string) => {
  const [encoded, signature] = rawState.split(".")
  const expectedSignature = createHmac("sha256", getStateSecret()).update(encoded).digest("base64url")

  if (!encoded || !signature || signature !== expectedSignature) {
    throw new Error("Estado do Google Drive inválido.")
  }

  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    userId: string
    returnTo?: string
    issuedAt: number
  }

  if (!parsed.userId || Date.now() - parsed.issuedAt > 15 * 60 * 1000) {
    throw new Error("Estado do Google Drive expirou.")
  }

  return parsed
}

export const buildGoogleDriveAuthUrl = (state: string) => {
  const client = getGoogleOauthClient()
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_DRIVE_SCOPE],
    state,
  })
}

export const upsertDriveConnection = async ({
  userId,
  accessToken,
  refreshToken,
  tokenExpiresAt,
  scope,
  driveEmail,
}: {
  userId: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt: string | null
  scope: string
  driveEmail?: string | null
}) => {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("google_drive_connections").upsert(
    {
      user_id: userId,
      encrypted_access_token: encryptValue(accessToken),
      encrypted_refresh_token: encryptValue(refreshToken),
      token_expires_at: tokenExpiresAt,
      scope,
      drive_email: driveEmail ?? null,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export const getDriveConnection = async (userId: string) => {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("google_drive_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<DriveConnectionRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data ? toRowConnection(data) : null
}

export const getAuthorizedDriveClient = async (userId: string) => {
  const connection = await getDriveConnection(userId)

  if (!connection) {
    throw new Error("Google Drive não conectado para este usuário.")
  }

  const oauth2Client = getGoogleOauthClient()
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt).getTime() : undefined,
  })

  const now = Date.now()
  const expiryTime = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt).getTime() : 0

  if (!expiryTime || expiryTime - now < 60_000) {
    const refreshed = await oauth2Client.refreshAccessToken()
    const refreshedAccessToken = refreshed.credentials.access_token || connection.accessToken
    const refreshedRefreshToken = refreshed.credentials.refresh_token || connection.refreshToken
    const refreshedExpiry = refreshed.credentials.expiry_date
      ? new Date(refreshed.credentials.expiry_date).toISOString()
      : connection.tokenExpiresAt

    await upsertDriveConnection({
      userId,
      accessToken: refreshedAccessToken,
      refreshToken: refreshedRefreshToken,
      tokenExpiresAt: refreshedExpiry,
      scope: connection.scope,
      driveEmail: connection.driveEmail,
    })

    oauth2Client.setCredentials({
      access_token: refreshedAccessToken,
      refresh_token: refreshedRefreshToken,
      expiry_date: refreshed.credentials.expiry_date ?? undefined,
    })
  }

  return {
    oauth2Client,
    drive: google.drive({ version: "v3", auth: oauth2Client }),
  }
}

export const exchangeDriveCode = async (code: string) => {
  const oauth2Client = getGoogleOauthClient()
  const tokenResponse = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokenResponse.tokens)

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
  const userInfo = await oauth2.userinfo.get().catch(() => null)

  return {
    accessToken: tokenResponse.tokens.access_token ?? "",
    refreshToken: tokenResponse.tokens.refresh_token ?? "",
    tokenExpiresAt: tokenResponse.tokens.expiry_date ? new Date(tokenResponse.tokens.expiry_date).toISOString() : null,
    scope: tokenResponse.tokens.scope ?? GOOGLE_DRIVE_SCOPE,
    driveEmail: userInfo?.data.email ?? null,
  }
}

export const listDriveFiles = async ({
  userId,
  folderId,
  query,
  mimePrefix,
}: {
  userId: string
  folderId?: string
  query?: string
  mimePrefix?: string
}) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  const filters: string[] = ["trashed = false"]
  const parentId = folderId?.trim() || "root"

  filters.push(`'${parentId.replace(/'/g, "\\'")}' in parents`)

  if (query?.trim()) {
    filters.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`)
  }

  if (mimePrefix === "video") {
    filters.push("mimeType contains 'video/'")
  } else if (mimePrefix === "folder") {
    filters.push("mimeType = 'application/vnd.google-apps.folder'")
  }

  const response = await drive.files.list({
    q: filters.join(" and "),
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents,thumbnailLink)",
  })

  return response.data.files ?? []
}

export const createDrivePublicPermission = async (userId: string, fileId: string) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  const permission = await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    fields: "id",
  })
  const file = await drive.files.get({
    fileId,
    supportsAllDrives: true,
    fields: "id,name,webViewLink,webContentLink,mimeType",
  })

  return {
    permissionId: permission.data.id ?? "",
    fileName: file.data.name ?? "Vídeo",
    webViewLink: file.data.id ? `https://drive.google.com/file/d/${file.data.id}/preview` : file.data.webViewLink ?? file.data.webContentLink ?? "",
    mimeType: file.data.mimeType ?? "",
  }
}

export const deleteDrivePermission = async (userId: string, fileId: string, permissionId: string) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  await drive.permissions.delete({ fileId, permissionId, supportsAllDrives: true })
}

export const copyDriveFileToFolder = async ({
  userId,
  fileId,
  targetFolderId,
  name,
}: {
  userId: string
  fileId: string
  targetFolderId: string
  name?: string
}) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  const response = await drive.files.copy({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      name,
      parents: [targetFolderId],
    },
    fields: "id,name,webViewLink,mimeType",
  })

  return response.data
}

export const createDriveFolderShortcut = async ({
  userId,
  folderId,
  name,
  targetFolderId = "root",
}: {
  userId: string
  folderId: string
  name: string
  targetFolderId?: string
}) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.shortcut",
      parents: [targetFolderId || "root"],
      shortcutDetails: {
        targetId: folderId,
      },
    },
    fields: "id,name,webViewLink,mimeType,shortcutDetails",
  })

  return response.data
}

export const uploadDriveFileToFolder = async ({
  userId,
  folderId,
  fileName,
  mimeType,
  buffer,
}: {
  userId: string
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,name,webViewLink,mimeType,size",
  })

  return response.data
}

export const getDriveFileMeta = async (userId: string, fileId: string) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  const response = await drive.files.get({
    fileId,
    supportsAllDrives: true,
    fields: "id,name,mimeType,webViewLink,webContentLink,size",
  })

  return response.data
}

export const getDriveFileStream = async (userId: string, fileId: string) => {
  const { drive } = await getAuthorizedDriveClient(userId)
  return drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  )
}
