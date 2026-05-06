import { NextRequest, NextResponse } from "next/server"
import { decodeDriveState, exchangeDriveCode, upsertDriveConnection } from "@/lib/google-drive"
import { getSiteUrl } from "@/lib/site-url"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim()
  const rawState = request.nextUrl.searchParams.get("state")?.trim()
  const error = request.nextUrl.searchParams.get("error")?.trim()

  if (error) {
    return NextResponse.redirect(`${getSiteUrl()}/dashboard/pack?drive=error`)
  }

  if (!code || !rawState) {
    return NextResponse.redirect(`${getSiteUrl()}/dashboard/pack?drive=invalid`)
  }

  try {
    const state = decodeDriveState(rawState)
    const tokenPayload = await exchangeDriveCode(code)

    await upsertDriveConnection({
      userId: state.userId,
      accessToken: tokenPayload.accessToken,
      refreshToken: tokenPayload.refreshToken,
      tokenExpiresAt: tokenPayload.tokenExpiresAt,
      scope: tokenPayload.scope,
      driveEmail: tokenPayload.driveEmail,
    })

    const safeReturnTo = state.returnTo?.startsWith("/dashboard") ? state.returnTo : "/dashboard/pack"
    return NextResponse.redirect(`${getSiteUrl()}${safeReturnTo}?drive=connected`)
  } catch (callbackError) {
    console.error(callbackError)
    return NextResponse.redirect(`${getSiteUrl()}/dashboard/pack?drive=error`)
  }
}
