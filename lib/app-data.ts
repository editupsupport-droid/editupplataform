export type PlanId = "free" | "starter" | "essential"
export type JobStatus = "open" | "found" | "cancelled"

export type ContactMethod = "phone" | "email" | "instagram"
export type ProfileLanguage = "en" | "pt-BR" | "es"
export type PortfolioTemplate = "studio-pro" | "viral-creator" | "minimal-luxury"

export type VideoStyle = "long-form" | "short-form"

export interface ProfileThemeColors {
  pageBackground: string
  cardBackground: string
  textColor: string
  accentColor: string
}

export type EditTool =
  | "adobe-premiere-pro"
  | "photoshop"
  | "vegas"
  | "adobe-after-effects"
  | "davinci-resolve"
  | "capcut"

export interface EditorProfile {
  fullName: string
  professionalTitle: string
  bio: string
  location: string
  language: ProfileLanguage
  slug: string
  bannerUrl: string
  photoUrl: string
  videoUrls: string[]
  editTools: EditTool[]
  videoStyles: VideoStyle[]
  contactMethod: ContactMethod
  contactValue: string
  themeColors: ProfileThemeColors
  portfolioTemplate: PortfolioTemplate
}

export interface AppUser {
  id: string
  name: string
  email: string
  password: string
  plan: PlanId
  createdAt: string
  monthlyRevenueGoal?: number
  appLanguage?: "pt" | "en" | "es"
  appearanceTheme?: unknown
  accountPhotoUrl?: string
  accountPhotoPosition?: { x: number; y: number }
  profile: EditorProfile
}

export interface JobPost {
  id: string
  title: string
  company: string
  location: string
  format: string
  salary: string
  description: string
  referenceLink: string
  contact: string
  publishedById?: string
  publishedBy: string
  status: JobStatus
  createdAt: string
}

export interface ParsedBannerAssets {
  bannerUrl: string
  photoUrl: string
  language: ProfileLanguage
  themeColors: ProfileThemeColors
  portfolioTemplate: PortfolioTemplate
}

const defaultThemeColors = (): ProfileThemeColors => ({
  pageBackground: "#0b1020",
  cardBackground: "#11182d",
  textColor: "#f8fafc",
  accentColor: "#37352F",
})

export const PUBLISHER_EMAILS = [
  "muriloeditor2023@gmail.com",
  "marinhojose1103@gmail.com",
] as const

export const DIRECT_LOGIN_EMAILS = [
  "muriloeditor2023@gmail.com",
  "marinhojose1103@gmail.com",
  "euagoodream@gmail.com",
] as const

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  essential: "Essential",
}

const DASHBOARD_ACCESS_BY_PLAN: Record<PlanId, string[]> = {
  free: ["/dashboard/calculadora", "/dashboard/planos", "/dashboard/configuracoes"],
  starter: [
    "/dashboard/calculadora",
    "/dashboard/pack",
    "/dashboard/exchange",
    "/dashboard/drive",
    "/dashboard/planos",
    "/dashboard/configuracoes",
  ],
  essential: ["/dashboard"],
}

export const EDIT_TOOL_LABELS: Record<EditTool, string> = {
  "adobe-premiere-pro": "Adobe Premiere Pro",
  photoshop: "Photoshop",
  vegas: "Vegas",
  "adobe-after-effects": "Adobe After Effects",
  "davinci-resolve": "DaVinci Resolve",
  capcut: "CapCut",
}

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  "long-form": "Long Form",
  "short-form": "Short Form",
}

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  phone: "Telefone",
  email: "Email",
  instagram: "Instagram",
}

export const PROFILE_LANGUAGE_LABELS: Record<ProfileLanguage, string> = {
  en: "Inglês",
  "pt-BR": "Português",
  es: "Espanhol",
}

export const planMeets = (currentPlan: PlanId, requiredPlan: PlanId) => {
  const levels: Record<PlanId, number> = {
    free: 0,
    starter: 1,
    essential: 2,
  }

  return levels[currentPlan] >= levels[requiredPlan]
}

export const canAccessDashboardPath = (pathname: string, plan: PlanId) =>
  DASHBOARD_ACCESS_BY_PLAN[plan].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

export const isPublisherEmail = (email: string) =>
  PUBLISHER_EMAILS.includes(email.toLowerCase() as (typeof PUBLISHER_EMAILS)[number])

export const canDirectLoginEmail = (email: string) =>
  DIRECT_LOGIN_EMAILS.includes(email.toLowerCase() as (typeof DIRECT_LOGIN_EMAILS)[number])

export const getDefaultPlanForEmail = (email: string): PlanId =>
  canDirectLoginEmail(email) ? "essential" : "free"

export const getDefaultPublishPermission = (email: string) => isPublisherEmail(email)

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export const uniqueSlug = (base: string, existingSlugs: string[], fallback = "editor") => {
  const normalizedBase = slugify(base) || fallback
  let candidate = normalizedBase
  let counter = 2

  while (existingSlugs.includes(candidate)) {
    candidate = `${normalizedBase}-${counter}`
    counter += 1
  }

  return candidate
}

export const createDefaultProfile = (name: string, email: string, existingSlugs: string[]): EditorProfile => ({
  fullName: name,
  professionalTitle: "Editor de video",
  bio: "",
  location: "",
  language: "pt-BR",
  slug: uniqueSlug(name || email.split("@")[0], existingSlugs, email.split("@")[0]),
  bannerUrl: "",
  photoUrl: "",
  videoUrls: [""],
  editTools: [],
  videoStyles: [],
  contactMethod: "email",
  contactValue: email,
  themeColors: defaultThemeColors(),
  portfolioTemplate: "studio-pro",
})

export const parseVideoUrls = (rawValue: unknown): string[] => {
  if (Array.isArray(rawValue)) {
    return rawValue.filter((item): item is string => typeof item === "string").filter(Boolean)
  }

  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return [""]
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (Array.isArray(parsed)) {
      const urls = parsed.filter((item): item is string => typeof item === "string").filter(Boolean)
      return urls.length > 0 ? urls : [""]
    }
  } catch {}

  return [rawValue]
}

export const serializeVideoUrls = (videoUrls: string[]) => {
  const normalized = videoUrls.map((url) => url.trim()).filter(Boolean)
  if (normalized.length <= 1) {
    return normalized[0] ?? ""
  }

  return JSON.stringify(normalized)
}

export const parseBannerAssets = (rawValue: unknown): ParsedBannerAssets => {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return {
      bannerUrl: "",
      photoUrl: "",
      language: "pt-BR" as ProfileLanguage,
      themeColors: defaultThemeColors(),
      portfolioTemplate: "studio-pro",
    }
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (parsed && typeof parsed === "object") {
      return {
        bannerUrl: typeof parsed.bannerUrl === "string" ? parsed.bannerUrl : "",
        photoUrl: typeof parsed.photoUrl === "string" ? parsed.photoUrl : "",
        language:
          parsed.language === "pt-BR" || parsed.language === "es" || parsed.language === "en"
            ? (parsed.language as ProfileLanguage)
            : "pt-BR",
        themeColors: {
          pageBackground:
            typeof parsed.themeColors?.pageBackground === "string" ? parsed.themeColors.pageBackground : defaultThemeColors().pageBackground,
          cardBackground:
            typeof parsed.themeColors?.cardBackground === "string" ? parsed.themeColors.cardBackground : defaultThemeColors().cardBackground,
          textColor:
            typeof parsed.themeColors?.textColor === "string" ? parsed.themeColors.textColor : defaultThemeColors().textColor,
          accentColor:
            typeof parsed.themeColors?.accentColor === "string" ? parsed.themeColors.accentColor : defaultThemeColors().accentColor,
        },
        portfolioTemplate:
          parsed.portfolioTemplate === "viral-creator" || parsed.portfolioTemplate === "minimal-luxury" || parsed.portfolioTemplate === "studio-pro"
            ? parsed.portfolioTemplate
            : "studio-pro",
      }
    }
  } catch {}

  return {
    bannerUrl: rawValue,
    photoUrl: "",
    language: "pt-BR" as ProfileLanguage,
    themeColors: defaultThemeColors(),
    portfolioTemplate: "studio-pro",
  }
}

export const serializeBannerAssets = (
  bannerUrl: string,
  photoUrl: string,
  language: ProfileLanguage = "pt-BR",
  themeColors: ProfileThemeColors = defaultThemeColors(),
  portfolioTemplate: PortfolioTemplate = "studio-pro"
) => {
  const normalizedBanner = bannerUrl.trim()
  const normalizedPhoto = photoUrl.trim()
  const normalizedTheme = {
    pageBackground: themeColors.pageBackground,
    cardBackground: themeColors.cardBackground,
    textColor: themeColors.textColor,
    accentColor: themeColors.accentColor,
  }

  if (
    !normalizedPhoto &&
    language === "pt-BR" &&
    portfolioTemplate === "studio-pro" &&
    JSON.stringify(normalizedTheme) === JSON.stringify(defaultThemeColors())
  ) {
    return normalizedBanner
  }

  return JSON.stringify({
    bannerUrl: normalizedBanner,
    photoUrl: normalizedPhoto,
    language,
    themeColors: normalizedTheme,
    portfolioTemplate,
  })
}

const JOB_META_MARKER = "\n\n[EditUpMeta]"

export const parseJobDescription = (rawValue: string | null | undefined) => {
  const description = rawValue ?? ""
  const markerIndex = description.lastIndexOf(JOB_META_MARKER)

  if (markerIndex === -1) {
    return {
      description: description.trim(),
      referenceLink: "",
    }
  }

  const visibleDescription = description.slice(0, markerIndex).trim()
  const rawMeta = description.slice(markerIndex + JOB_META_MARKER.length).trim()

  try {
    const parsed = JSON.parse(rawMeta) as { referenceLink?: unknown }
    return {
      description: visibleDescription,
      referenceLink: typeof parsed.referenceLink === "string" ? parsed.referenceLink.trim() : "",
    }
  } catch {
    return {
      description: description.trim(),
      referenceLink: "",
    }
  }
}

export const serializeJobDescription = (description: string, referenceLink = "") => {
  const normalizedDescription = description.trim()
  const normalizedReferenceLink = referenceLink.trim()

  if (!normalizedReferenceLink) {
    return normalizedDescription
  }

  return `${normalizedDescription}${JOB_META_MARKER}${JSON.stringify({ referenceLink: normalizedReferenceLink })}`
}

const seededUsersBase = [
  {
    id: "seed-murilo",
    name: "Murilo Editor",
    email: "muriloeditor2023@gmail.com",
    password: "Murilo1212#",
    plan: "essential" as PlanId,
    createdAt: "2026-04-13T09:00:00.000Z",
  },
  {
    id: "seed-marinho",
    name: "Marinho Jose",
    email: "marinhojose1103@gmail.com",
    password: "Murilo1212#",
    plan: "essential" as PlanId,
    createdAt: "2026-04-13T09:00:00.000Z",
  },
  {
    id: "seed-goodream",
    name: "Eu Ago Dream",
    email: "euagoodream@gmail.com",
    password: "Murilo1212#",
    plan: "essential" as PlanId,
    createdAt: "2026-04-13T09:30:00.000Z",
  },
]

export const seededUsers: AppUser[] = seededUsersBase.reduce<AppUser[]>((acc, user) => {
  const existingSlugs = acc.map((item) => item.profile.slug)

  acc.push({
    ...user,
    profile: createDefaultProfile(user.name, user.email, existingSlugs),
  })

  return acc
}, [])

export const seededJobs: JobPost[] = [
  {
    id: "job-1",
    title: "Short-Form Video Editor for Info Product Brand",
    company: "Creator Lab Agency",
    location: "Remote",
    format: "Freelance",
    salary: "$300 to $500 / month",
    description:
      "Looking for a fast-paced editor for 20 shorts per month, with captions and retention-focused cuts.",
    referenceLink: "",
    contact: "@creatorlab.jobs",
    publishedById: "seed-murilo",
    publishedBy: "muriloeditor2023@gmail.com",
    status: "open",
    createdAt: "2026-04-13T10:00:00.000Z",
  },
  {
    id: "job-2",
    title: "Long-Form Editor for YouTube Channel",
    company: "North Studio",
    location: "Hybrid / Recife",
    format: "Contract",
    salary: "To be discussed",
    description:
      "Seeking an editor for 8 to 20 minute videos with editing, sound design, and organized weekly delivery.",
    referenceLink: "",
    contact: "contato@estudionorte.com",
    publishedById: "seed-marinho",
    publishedBy: "marinhojose1103@gmail.com",
    status: "open",
    createdAt: "2026-04-13T11:00:00.000Z",
  },
]
