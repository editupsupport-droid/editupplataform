export type PlanId = "free" | "starter" | "essential"
export type JobStatus = "open" | "found" | "cancelled"

export type ContactMethod = "phone" | "email" | "instagram"

export type VideoStyle = "long-form" | "short-form"

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
  slug: string
  bannerUrl: string
  photoUrl: string
  videoUrls: string[]
  editTools: EditTool[]
  videoStyles: VideoStyle[]
  contactMethod: ContactMethod
  contactValue: string
}

export interface AppUser {
  id: string
  name: string
  email: string
  password: string
  plan: PlanId
  createdAt: string
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
  contact: string
  publishedBy: string
  status: JobStatus
  createdAt: string
}

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
  email: "E-mail",
  instagram: "Instagram",
}

export const planMeets = (currentPlan: PlanId, requiredPlan: PlanId) => {
  const levels: Record<PlanId, number> = {
    free: 0,
    starter: 1,
    essential: 2,
  }

  return levels[currentPlan] >= levels[requiredPlan]
}

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
  professionalTitle: "Editor de vídeo",
  bio: "",
  location: "",
  slug: uniqueSlug(name || email.split("@")[0], existingSlugs, email.split("@")[0]),
  bannerUrl: "",
  photoUrl: "",
  videoUrls: [""],
  editTools: [],
  videoStyles: [],
  contactMethod: "email",
  contactValue: email,
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

export const parseBannerAssets = (rawValue: unknown) => {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return { bannerUrl: "", photoUrl: "" }
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (parsed && typeof parsed === "object") {
      return {
        bannerUrl: typeof parsed.bannerUrl === "string" ? parsed.bannerUrl : "",
        photoUrl: typeof parsed.photoUrl === "string" ? parsed.photoUrl : "",
      }
    }
  } catch {}

  return {
    bannerUrl: rawValue,
    photoUrl: "",
  }
}

export const serializeBannerAssets = (bannerUrl: string, photoUrl: string) => {
  if (!photoUrl.trim()) {
    return bannerUrl.trim()
  }

  return JSON.stringify({
    bannerUrl: bannerUrl.trim(),
    photoUrl: photoUrl.trim(),
  })
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
    title: "Editor de Shorts para infoprodutor",
    company: "Agência Creator Lab",
    location: "Remoto",
    format: "Freelance",
    salary: "R$ 1.500 a R$ 2.500 / mês",
    description:
      "Precisamos de um editor com ritmo dinâmico para 20 shorts por mês, com legenda e cortes orientados a retenção.",
    contact: "@creatorlab.jobs",
    publishedBy: "muriloeditor2023@gmail.com",
    status: "open",
    createdAt: "2026-04-13T10:00:00.000Z",
  },
  {
    id: "job-2",
    title: "Editor Long Form para canal no YouTube",
    company: "Estúdio Norte",
    location: "Híbrido / Recife",
    format: "Contrato PJ",
    salary: "A combinar",
    description:
      "Buscamos editor para vídeos de 8 a 20 minutos com montagem, sound design e organização de fluxo semanal.",
    contact: "contato@estudionorte.com",
    publishedBy: "marinhojose1103@gmail.com",
    status: "open",
    createdAt: "2026-04-13T11:00:00.000Z",
  },
]
