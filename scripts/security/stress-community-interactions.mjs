#!/usr/bin/env node

const usage = `
Usage:
  EDITUP_BASE_URL=http://localhost:3000 \\
  EDITUP_AUTH_TOKEN=<supabase-access-token> \\
  EDITUP_RESOURCE_ID=<community-resource-uuid> \\
  node scripts/security/stress-community-interactions.mjs
`

const baseUrl = process.env.EDITUP_BASE_URL || "http://localhost:3000"
const authToken = process.env.EDITUP_AUTH_TOKEN
const resourceId = process.env.EDITUP_RESOURCE_ID
const iterations = Number(process.env.EDITUP_STRESS_ITERATIONS || 25)

if (!authToken || !resourceId) {
  console.error(usage.trim())
  process.exit(1)
}

const sendInteraction = async (type) => {
  const response = await fetch(`${baseUrl}/api/community/interactions`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${authToken}`,
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({ resourceId, type }),
  })

  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

const readResource = async () => {
  const response = await fetch(`${baseUrl}/api/community/resources?id=${resourceId}`, {
    headers: {
      authorization: `Bearer ${authToken}`,
      origin: baseUrl,
    },
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

const main = async () => {
  const results = []

  for (let index = 0; index < iterations; index += 1) {
    const pair = await Promise.all([sendInteraction("like"), sendInteraction("dislike")])
    results.push(pair)
  }

  const finalState = await readResource()
  const failures = results.flat().filter((result) => result.status >= 400)

  console.log(JSON.stringify({
    iterations,
    requests: results.length * 2,
    failures,
    finalState,
  }, null, 2))

  const resource = finalState.payload?.resources?.[0]
  if (resource?.myInteraction !== "like" && resource?.myInteraction !== "dislike") {
    console.error("Invariant failed: current user should end with exactly one interaction.")
    process.exit(2)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
