export interface ReviewTimelineItem {
  id: string
  timestamp: number
  note: string
  completed?: boolean
}

export interface ReviewFeedbackData {
  priceUsd: number | null
  revisionItems: ReviewTimelineItem[]
}

const defaultReviewFeedback = (): ReviewFeedbackData => ({
  priceUsd: null,
  revisionItems: [],
})

export const parseReviewFeedback = (rawValue: string | null | undefined): ReviewFeedbackData => {
  if (!rawValue?.trim()) return defaultReviewFeedback()

  try {
    const parsed = JSON.parse(rawValue) as Partial<ReviewFeedbackData>
    return {
      priceUsd: typeof parsed.priceUsd === "number" && Number.isFinite(parsed.priceUsd) ? parsed.priceUsd : null,
      revisionItems: Array.isArray(parsed.revisionItems)
        ? parsed.revisionItems
            .filter((item): item is ReviewTimelineItem => {
              return (
                !!item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.timestamp === "number" &&
                typeof item.note === "string"
              )
            })
            .map((item) => ({
              id: item.id,
              timestamp: item.timestamp,
              note: item.note,
              completed: Boolean(item.completed),
            }))
        : [],
    }
  } catch {
    return {
      priceUsd: null,
      revisionItems: rawValue.trim()
        ? [
            {
              id: "legacy-feedback",
              timestamp: 0,
              note: rawValue.trim(),
              completed: false,
            },
          ]
        : [],
    }
  }
}

export const serializeReviewFeedback = (feedback: ReviewFeedbackData) =>
  JSON.stringify({
    priceUsd: feedback.priceUsd,
    revisionItems: feedback.revisionItems,
  })

export const formatTimestamp = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const parseTimestampInput = (value: string) => {
  const parts = value
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length || parts.some((part) => Number.isNaN(Number(part)))) {
    return null
  }

  if (parts.length === 1) {
    return Number(parts[0])
  }

  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1])
  }

  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  }

  return null
}

export const parseGoogleDriveFileId = (url: string) => {
  if (!url) return null

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

export const getGoogleDriveEmbedUrl = (url: string) => {
  const fileId = parseGoogleDriveFileId(url)
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null
}

export const getGoogleDriveVideoUrl = (url: string) => {
  const fileId = parseGoogleDriveFileId(url)
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null
}
