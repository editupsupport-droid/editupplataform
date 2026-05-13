"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  AppUser,
  canDirectLoginEmail,
  createDefaultProfile,
  EditorProfile,
  getDefaultPlanForEmail,
  getDefaultPublishPermission,
  PlanId,
  isPublisherEmail,
  JobPost,
  JobStatus,
  parseBannerAssets,
  parseJobDescription,
  parseVideoUrls,
  seededJobs,
  seededUsers,
  serializeBannerAssets,
  serializeJobDescription,
  serializeVideoUrls,
  uniqueSlug,
} from "@/lib/app-data"
import { authFetch, getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"
import { builtInAppearanceThemes } from "@/lib/appearance"

const USERS_STORAGE_KEY = "editpro-users"
const JOBS_STORAGE_KEY = "editpro-jobs"
const SESSION_STORAGE_KEY = "editpro-current-user"
const SUPABASE_PROFILE_CACHE_KEY = "editpro-supabase-profile-cache"
const OTP_VERIFY_TIMEOUT_MS = 15000
const OTP_RESEND_COOLDOWN_MS = 60_000
const OTP_PENDING_WINDOW_MS = 10 * 60_000

interface RegisterPayload {
  name: string
  email: string
  password: string
}

interface JobPayload {
  title: string
  company: string
  location: string
  format: string
  salary: string
  description: string
  referenceLink: string
  contact: string
}

interface AppContextValue {
  users: AppUser[]
  jobs: JobPost[]
  currentUser: AppUser | null
  isReady: boolean
  registerUser: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string; requiresCode?: boolean; signedIn?: boolean }>
  loginUser: (email: string, password: string) => Promise<{ success: boolean; message?: string; requiresCode?: boolean }>
  sendEmailCode: (email: string, shouldCreateUser?: boolean) => Promise<{ success: boolean; message?: string }>
  verifyEmailCode: (email: string, token: string) => Promise<{ success: boolean; message?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>
  logoutUser: () => Promise<void>
  updateCurrentUserPlan: (plan: AppUser["plan"]) => Promise<{ success: boolean; message?: string }>
  refreshCurrentUser: () => Promise<void>
  saveCurrentUserProfile: (profile: EditorProfile) => Promise<{ success: boolean; message?: string; profile?: EditorProfile }>
  createJob: (payload: JobPayload) => Promise<{ success: boolean; message?: string }>
  deleteJob: (jobId: string) => Promise<void>
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<{ success: boolean; message?: string }>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

const mergeSeededUsers = (storedUsers: AppUser[]) => {
  const usersByEmail = new Map(storedUsers.map((user) => [user.email.toLowerCase(), user]))

  seededUsers.forEach((seedUser) => {
    const key = seedUser.email.toLowerCase()
    if (!usersByEmail.has(key)) {
      usersByEmail.set(key, seedUser)
    }
  })

  return Array.from(usersByEmail.values())
}

const normalizeTools = (tools: unknown) => (Array.isArray(tools) ? tools.filter(Boolean) : [])

const getAuthAvatarUrl = (authUser: User) => {
  const avatarUrl = authUser.user_metadata?.avatar_url
  const pictureUrl = authUser.user_metadata?.picture

  if (typeof avatarUrl === "string" && avatarUrl.trim()) return avatarUrl.trim()
  if (typeof pictureUrl === "string" && pictureUrl.trim()) return pictureUrl.trim()

  return ""
}

const createOptimisticUserFromAuthUser = (authUser: User): AppUser => {
  const normalizedEmail = authUser.email?.trim().toLowerCase() ?? ""
  const fallbackName =
    typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name.trim()
      ? authUser.user_metadata.name.trim()
      : normalizedEmail.split("@")[0] || "Editor"
  const defaultProfile = createDefaultProfile(fallbackName, normalizedEmail, [])
  const avatarUrl = getAuthAvatarUrl(authUser)

  return {
    id: authUser.id,
    name: fallbackName,
    email: normalizedEmail,
    password: "",
    plan: getDefaultPlanForEmail(normalizedEmail),
    createdAt: new Date().toISOString(),
    profile: {
      ...defaultProfile,
      photoUrl: avatarUrl || defaultProfile.photoUrl,
    },
  }
}

const mapProfileToAppUser = (profile: Record<string, unknown>): AppUser => {
  const bannerAssets = parseBannerAssets(profile.banner_url)
  const videoUrls = parseVideoUrls(profile.video_url)
  const appearanceTheme = profile.appearance_theme && typeof profile.appearance_theme === "object" ? profile.appearance_theme as Record<string, unknown> : null
  const accountMeta = appearanceTheme?.__account && typeof appearanceTheme.__account === "object" ? appearanceTheme.__account as Record<string, unknown> : null
  const accountPosition = accountMeta?.photoPosition && typeof accountMeta.photoPosition === "object"
    ? accountMeta.photoPosition as Record<string, unknown>
    : null
  const normalizedPlan = isValidPlan(profile.plan) ? profile.plan : "free"
  const normalizedSubscriptionStatus =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing" ||
    profile.subscription_status === "past_due" ||
    profile.subscription_status === "canceled" ||
    profile.subscription_status === "incomplete" ||
    profile.subscription_status === "none"
      ? profile.subscription_status
      : "none"

  return {
    id: String(profile.id),
    name: String(accountMeta?.name ?? profile.full_name ?? profile.email ?? "Editor"),
    email: String(profile.email ?? ""),
    password: "",
    plan: normalizedPlan,
    subscriptionStatus: normalizedSubscriptionStatus,
    creativeCloudRedeemAvailableUntil: typeof profile.creative_cloud_redeem_available_until === "string" ? profile.creative_cloud_redeem_available_until : undefined,
    createdAt: String(profile.created_at ?? new Date().toISOString()),
    monthlyRevenueGoal: Number(profile.monthly_revenue_goal ?? 5000),
    appLanguage:
      profile.app_language === "pt" || profile.app_language === "en" || profile.app_language === "es"
        ? profile.app_language
        : undefined,
    appearanceTheme: profile.appearance_theme,
    accountPhotoUrl: String(accountMeta?.photoUrl ?? ""),
    accountPhotoPosition: {
      x: Number(accountPosition?.x ?? 50),
      y: Number(accountPosition?.y ?? 50),
    },
    profile: {
      fullName: String(profile.full_name ?? profile.email ?? "Editor"),
      professionalTitle: String(profile.professional_title ?? "Editor de vídeo"),
      bio: String(profile.bio ?? ""),
      location: String(profile.location ?? ""),
      language: bannerAssets.language,
      slug: String(profile.slug ?? ""),
      bannerUrl: bannerAssets.bannerUrl,
      photoUrl: bannerAssets.photoUrl,
      videoUrls,
      editTools: normalizeTools(profile.edit_tools) as EditorProfile["editTools"],
      videoStyles: normalizeTools(profile.video_styles) as EditorProfile["videoStyles"],
      contactMethod: (profile.contact_method as EditorProfile["contactMethod"]) ?? "email",
      contactValue: String(profile.contact_value ?? profile.email ?? ""),
      themeColors: bannerAssets.themeColors,
      portfolioTemplate: bannerAssets.portfolioTemplate,
    },
  }
}

const mapJobRow = (job: Record<string, unknown>, activeUser: AppUser | null): JobPost => {
  const parsedJob = parseJobDescription(String(job.description ?? ""))

  return {
    id: String(job.id),
    title: String(job.title ?? ""),
    company: String(job.company ?? ""),
    location: String(job.location ?? ""),
    format: String(job.format ?? ""),
    salary: String(job.salary ?? ""),
    description: parsedJob.description,
    referenceLink: parsedJob.referenceLink,
    contact: String(job.contact ?? ""),
    publishedById: String(job.published_by ?? ""),
    publishedBy:
      String(job.published_by ?? "") === activeUser?.id
        ? activeUser.email
        : "Editor autorizado",
    status: (job.status as JobStatus) ?? "open",
    createdAt: String(job.created_at ?? new Date().toISOString()),
  }
}

const isValidPlan = (value: unknown): value is PlanId =>
  value === "free" || value === "starter" || value === "essential" || value === "pro"

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const otpStateRef = useRef<Map<string, { lastSentAt: number; pendingUntil: number }>>(new Map())
  const syncPromiseRef = useRef(Promise.resolve())

  const loadSupabaseJobs = async (activeUser: AppUser | null) => {
    const response = await authFetch("/api/jobs")
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      jobs?: Array<Record<string, unknown>>
    }

    if (!response.ok || !payload.jobs) {
      throw new Error(payload.error ?? "Não foi possível carregar as vagas.")
    }

    setJobs(payload.jobs.map((job) => mapJobRow(job, activeUser)))
  }

  const refreshSupabaseStateByUserId = async (userId: string) => {
    const supabase = getSupabaseClient()
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error || !profile) {
      throw new Error(error?.message ?? "Não foi possível carregar o perfil do usuário.")
    }

    const mappedUser = mapProfileToAppUser(profile)
    setCurrentUser(mappedUser)
    setUsers([mappedUser])
    window.localStorage.setItem(SUPABASE_PROFILE_CACHE_KEY, JSON.stringify(mappedUser))
    void loadSupabaseJobs(mappedUser).catch((error) => {
      console.error("Failed to load jobs during session refresh:", error)
      setJobs([])
    })
  }

  const ensureSupabaseProfile = async (authUser: User) => {
    const supabase = getSupabaseClient()
    const normalizedEmail = authUser.email?.trim().toLowerCase() ?? ""
    const avatarUrl = getAuthAvatarUrl(authUser)
    const fallbackName =
      typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name.trim()
        ? authUser.user_metadata.name.trim()
        : normalizedEmail.split("@")[0] || "Editor"

    const defaultProfile = createDefaultProfile(fallbackName, normalizedEmail, [])
    const defaultAppearanceTheme = builtInAppearanceThemes[0]
    const profilePayload = {
      id: authUser.id,
      email: normalizedEmail,
      full_name: fallbackName,
      professional_title: defaultProfile.professionalTitle,
      bio: defaultProfile.bio,
      location: defaultProfile.location,
      slug: defaultProfile.slug,
      banner_url: serializeBannerAssets(
        defaultProfile.bannerUrl,
        avatarUrl || defaultProfile.photoUrl,
        defaultProfile.language,
        defaultProfile.themeColors
      ),
      video_url: serializeVideoUrls(defaultProfile.videoUrls),
      edit_tools: defaultProfile.editTools,
      video_styles: defaultProfile.videoStyles,
      contact_method: defaultProfile.contactMethod,
      contact_value: normalizedEmail,
      plan: getDefaultPlanForEmail(normalizedEmail),
      can_publish_jobs: getDefaultPublishPermission(normalizedEmail),
      monthly_revenue_goal: 5000,
      app_language: "pt",
      appearance_theme: {
        ...defaultAppearanceTheme,
        __account: {
          name: fallbackName,
          photoUrl: avatarUrl || "",
          photoPosition: { x: 50, y: 50 },
        },
      },
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle()

    if (!existingProfile) {
      const { error } = await supabase.from("profiles").insert(profilePayload)
      if (error) {
        throw new Error(error.message)
      }
      return
    }

    const updates: Record<string, unknown> = {}
    const existingAssets = parseBannerAssets(existingProfile.banner_url)

    if (!existingProfile.email && normalizedEmail) {
      updates.email = normalizedEmail
    }

    if (!existingProfile.full_name && fallbackName) {
      updates.full_name = fallbackName
    }

    if (avatarUrl && !existingAssets.photoUrl) {
      updates.banner_url = serializeBannerAssets(
        existingAssets.bannerUrl,
        avatarUrl,
        existingAssets.language,
        existingAssets.themeColors,
        existingAssets.portfolioTemplate
      )
    }

    if (!isValidPlan(existingProfile.plan)) {
      updates.plan = getDefaultPlanForEmail(normalizedEmail)
    }

    if (typeof existingProfile.can_publish_jobs !== "boolean") {
      updates.can_publish_jobs = getDefaultPublishPermission(normalizedEmail)
    }

    if (canDirectLoginEmail(normalizedEmail)) {
      const expectedPlan = getDefaultPlanForEmail(normalizedEmail)
      const expectedPublishPermission = getDefaultPublishPermission(normalizedEmail)

      if (existingProfile.plan !== expectedPlan) {
        updates.plan = expectedPlan
      }

      if (existingProfile.can_publish_jobs !== expectedPublishPermission) {
        updates.can_publish_jobs = expectedPublishPermission
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("profiles").update(updates).eq("id", authUser.id)
      if (error) {
        throw new Error(error.message)
      }
    }
  }

  const syncSupabaseUser = async (authUser: User | null) => {
    if (!authUser) {
      setCurrentUser(null)
      setUsers([])
      setJobs([])
      return
    }

    await ensureSupabaseProfile(authUser)
    await refreshSupabaseStateByUserId(authUser.id)
  }

  const queueSupabaseSync = (authUser: User | null) => {
    syncPromiseRef.current = syncPromiseRef.current
      .catch(() => undefined)
      .then(() => syncSupabaseUser(authUser))
      .catch((error) => {
        console.error("Falha ao sincronizar sessao do Supabase:", error)
        if (!authUser) {
          setCurrentUser(null)
          setUsers([])
          setJobs([])
        }
      })

    return syncPromiseRef.current
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient()
      let isMounted = true

      const bootstrap = async () => {
        const cachedProfileRaw = window.localStorage.getItem(SUPABASE_PROFILE_CACHE_KEY)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          if (cachedProfileRaw) {
            try {
              const cachedProfile = JSON.parse(cachedProfileRaw) as AppUser
              if (cachedProfile?.id === session.user.id && isMounted) {
                setCurrentUser(cachedProfile)
                setUsers([cachedProfile])
              }
            } catch {}
          } else if (isMounted) {
            const optimisticUser = createOptimisticUserFromAuthUser(session.user)
            setCurrentUser(optimisticUser)
            setUsers([optimisticUser])
          }
        } else {
          window.localStorage.removeItem(SUPABASE_PROFILE_CACHE_KEY)
        }

        if (isMounted) {
          setIsReady(true)
        }

        void queueSupabaseSync(session?.user ?? null)
      }

      void bootstrap()

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const optimisticUser = createOptimisticUserFromAuthUser(session.user)
          if (isMounted) {
            setCurrentUser((prev) => prev ?? optimisticUser)
            setUsers((prev) => (prev.length > 0 ? prev : [optimisticUser]))
          }
        } else {
          window.localStorage.removeItem(SUPABASE_PROFILE_CACHE_KEY)
        }

        if (isMounted) {
          setIsReady(true)
        }

        void queueSupabaseSync(session?.user ?? null)
      })

      return () => {
        isMounted = false
        subscription.unsubscribe()
      }
    }

    const storedUsers = window.localStorage.getItem(USERS_STORAGE_KEY)
    const storedJobs = window.localStorage.getItem(JOBS_STORAGE_KEY)
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

    const parsedUsers = storedUsers ? (JSON.parse(storedUsers) as AppUser[]) : []
    const parsedJobs = storedJobs ? (JSON.parse(storedJobs) as JobPost[]) : seededJobs
    const mergedUsers = mergeSeededUsers(parsedUsers)
    const activeUser = mergedUsers.find((user) => user.id === storedSession) ?? null

    setUsers(mergedUsers)
    setJobs(parsedJobs)
    setCurrentUser(activeUser)
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!isReady || isSupabaseConfigured) return
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  }, [users, isReady])

  useEffect(() => {
    if (!isReady || isSupabaseConfigured) return
    window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs))
  }, [jobs, isReady])

  useEffect(() => {
    if (!isReady || isSupabaseConfigured) return

    if (currentUser?.id) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, currentUser.id)
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [currentUser, isReady])

  useEffect(() => {
    if (!isSupabaseConfigured || !isReady) return

    if (currentUser) {
      window.localStorage.setItem(SUPABASE_PROFILE_CACHE_KEY, JSON.stringify(currentUser))
    } else {
      window.localStorage.removeItem(SUPABASE_PROFILE_CACHE_KEY)
    }
  }, [currentUser, isReady])

  const isAuthThrottleMessage = (message: string) =>
    /rate limit|too many requests|email rate|for security purposes|security purposes|seconds?/i.test(message)

  const isEmailConfirmationRequiredMessage = (message: string) =>
    /confirm|confirmed|not confirmed|email verification|verify/i.test(message)

  const claimFreeTrialSignup = async (email: string) => {
    try {
      await fetch("/api/free-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
    } catch (error) {
      console.error("Nao foi possivel atualizar o contador do teste gratis:", error)
    }
  }

  const registerUser = async ({ name, email, password }: RegisterPayload) => {
    if (isSupabaseConfigured) {
      const normalizedEmail = email.trim().toLowerCase()
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/calculadora`,
          data: {
            name: name.trim(),
          },
        },
      })

      if (error) {
        const lowerMessage = error.message.toLowerCase()

        if (lowerMessage.includes("database error saving new user")) {
          return {
            success: false,
            message:
              "O Supabase bloqueou a criação do perfil do usuário no banco. Rode o SQL `supabase/fix-new-user-trigger.sql` no SQL Editor para corrigir o trigger de novos usuários.",
            requiresCode: false,
            signedIn: false,
          }
        }

        if (
          canDirectLoginEmail(normalizedEmail) &&
          (lowerMessage.includes("already") || lowerMessage.includes("registered") || lowerMessage.includes("exists"))
        ) {
          const signInResult = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })

          if (signInResult.error) {
            return { success: false, message: signInResult.error.message, signedIn: false }
          }

          return { success: true, message: "Conta reconhecida e login realizado.", signedIn: true }
        }

        if (isAuthThrottleMessage(error.message ?? "")) {
          const now = Date.now()
          otpStateRef.current.set(normalizedEmail, {
            lastSentAt: now,
            pendingUntil: now + OTP_PENDING_WINDOW_MS,
          })

          return {
            success: true,
            message: "Se você já pediu um código, use o último recebido no e-mail. Não é necessário pedir outro agora.",
            requiresCode: false,
            signedIn: false,
          }
        }

        return { success: false, message: error.message, requiresCode: false, signedIn: false }
      }

      if (data.session?.user) {
        void claimFreeTrialSignup(normalizedEmail)
        return {
          success: true,
          message: "Conta criada com sucesso.",
          requiresCode: false,
          signedIn: true,
        }
      }

      const signInResult = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (!signInResult.error) {
        void claimFreeTrialSignup(normalizedEmail)
        return {
          success: true,
          message: "Conta criada com sucesso.",
          requiresCode: false,
          signedIn: true,
        }
      }

      if (isEmailConfirmationRequiredMessage(signInResult.error.message ?? "")) {
        return {
          success: true,
          message:
            "A conta foi criada, mas ainda não pode entrar porque o Supabase deste projeto exige confirmação por e-mail. Se esse e-mail não chega, desative a confirmação de e-mail no Supabase ou configure o envio corretamente.",
          requiresCode: false,
          signedIn: false,
        }
      }

      return {
        success: false,
        message: signInResult.error.message,
        requiresCode: false,
        signedIn: false,
      }
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return { success: false, message: "Esse e-mail já está cadastrado." }
    }

    const existingSlugs = users.map((user) => user.profile.slug)
    const newUser: AppUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      plan: "free",
      createdAt: new Date().toISOString(),
      profile: createDefaultProfile(name.trim(), normalizedEmail, existingSlugs),
    }

    setUsers((prev) => [...prev, newUser])
    setCurrentUser(newUser)
    void claimFreeTrialSignup(normalizedEmail)
    return { success: true, requiresCode: false, signedIn: true }
  }

  const loginUser = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()
      const supabase = getSupabaseClient()

      const passwordValidation = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })

      if (passwordValidation.error) {
        if (isEmailConfirmationRequiredMessage(passwordValidation.error.message ?? "")) {
          return {
            success: false,
            message:
              "Sua conta existe, mas o Supabase ainda está exigindo confirmação por e-mail. Se você não recebeu nada, ajuste isso no painel do Supabase.",
            requiresCode: false,
          }
        }

        return {
          success: false,
          message: "E-mail ou senha inválidos.",
          requiresCode: false,
        }
      }
      return { success: true, requiresCode: false }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const foundUser = users.find(
      (user) => user.email.toLowerCase() === normalizedEmail && user.password === password
    )

    if (!foundUser) {
      return { success: false, message: "E-mail ou senha inválidos.", requiresCode: false }
    }

    setCurrentUser(foundUser)
    return { success: true, requiresCode: false }
  }

  const sendEmailCode = async (email: string, shouldCreateUser = true) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: "Supabase não configurado para envio de código." }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const supabase = getSupabaseClient()
    const now = Date.now()
    const previousState = otpStateRef.current.get(normalizedEmail)

    if (previousState && now - previousState.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      return {
        success: true,
        message: "Código já enviado recentemente. Use o último código recebido no e-mail.",
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser,
      },
    })

    if (error) {
      const message = error.message ?? ""
      const isRateLimit = isAuthThrottleMessage(message)

      // Keep security by still requiring OTP verification, but don't hard-break
      // if provider throttles repeated sends and we already have a fresh code window.
      if (isRateLimit && previousState && now < previousState.pendingUntil) {
        return {
          success: true,
          message: "Muitos envios em sequência. Use o último código recebido no e-mail.",
        }
      }

      if (isRateLimit) {
        otpStateRef.current.set(normalizedEmail, {
          lastSentAt: previousState?.lastSentAt ?? now,
          pendingUntil: now + OTP_PENDING_WINDOW_MS,
        })

        return {
          success: true,
          message: "Se você já pediu um código, use o último recebido no e-mail. Não é necessário pedir outro agora.",
        }
      }

      return { success: false, message }
    }

    otpStateRef.current.set(normalizedEmail, {
      lastSentAt: now,
      pendingUntil: now + OTP_PENDING_WINDOW_MS,
    })

    return { success: true, message: "Código enviado para o seu e-mail." }
  }

  const verifyEmailCode = async (email: string, token: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: "Supabase não configurado para validação." }
    }

    const supabase = getSupabaseClient()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedToken = token.trim()
    const otpTypes: Array<"email" | "signup"> = ["email", "signup"]
    let lastErrorMessage = "Código inválido ou expirado."

    for (const type of otpTypes) {
      const result = await Promise.race([
        supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedToken,
          type,
        }),
        new Promise<{ error: Error }>((resolve) => {
          window.setTimeout(
            () => resolve({ error: new Error("A verificação demorou demais. Tente novamente.") }),
            OTP_VERIFY_TIMEOUT_MS
          )
        }),
      ])

      if (!result.error) {
        otpStateRef.current.delete(normalizedEmail)
        const verifiedUser = result.data?.user ?? result.data?.session?.user ?? null
        await queueSupabaseSync(verifiedUser)
        return { success: true }
      }

      lastErrorMessage = result.error.message

      // "Token has expired or is invalid" can happen with wrong OTP type, so try fallback.
      const shouldTryNextType = /invalid|expired|token|otp/i.test(lastErrorMessage)
      if (!shouldTryNextType) {
        break
      }
    }

    return { success: false, message: lastErrorMessage }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        message:
          "Supabase não configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.",
      }
    }

    const supabase = getSupabaseClient()
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true }
  }

  const logoutUser = async () => {
    if (isSupabaseConfigured) {
      await getSupabaseClient().auth.signOut()
      setCurrentUser(null)
      setUsers([])
      setJobs([])
      return
    }

    setCurrentUser(null)
    setUsers([])
    setJobs([])
  }

  const updateCurrentUserPlan = async (plan: AppUser["plan"]) => {
    if (!currentUser) {
      return { success: false, message: "Faça login para alterar o plano." }
    }

    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient()
        .from("profiles")
        .update({
          plan,
          subscription_tier: plan === "pro" ? "pro" : plan === "essential" ? "essential" : "starter",
          subscription_status: plan === "free" || plan === "starter" ? "none" : "active",
        })
        .eq("id", currentUser.id)

      if (error) {
        return { success: false, message: error.message }
      }

      await refreshSupabaseStateByUserId(currentUser.id)
      return { success: true, message: "Plano atualizado com sucesso." }
    }

    setUsers((prev) =>
      prev.map((user) => (user.id === currentUser.id ? { ...user, plan } : user))
    )
    setCurrentUser((prev) => (prev ? { ...prev, plan } : prev))
    return { success: true, message: "Plano atualizado com sucesso." }
  }

  const refreshCurrentUser = async () => {
    if (!currentUser || !isSupabaseConfigured) return
    await refreshSupabaseStateByUserId(currentUser.id)
  }

  const saveCurrentUserProfile = async (profile: EditorProfile) => {
    if (!currentUser) {
      return { success: false, message: "Faça login para salvar seu perfil." }
    }

    if (isSupabaseConfigured) {
      const normalizedProfile: EditorProfile = {
        ...profile,
        fullName: profile.fullName.trim(),
        professionalTitle: profile.professionalTitle.trim(),
        bio: profile.bio.trim(),
        location: profile.location.trim(),
        language: profile.language,
        slug: profile.slug.trim(),
        bannerUrl: profile.bannerUrl.trim(),
        photoUrl: profile.photoUrl.trim(),
        videoUrls: (profile.videoUrls ?? []).map((url) => url.trim()).filter(Boolean),
        editTools: [...new Set(profile.editTools ?? [])],
        videoStyles: [...new Set(profile.videoStyles ?? [])],
        contactValue: profile.contactValue.trim(),
        themeColors: profile.themeColors,
        portfolioTemplate: profile.portfolioTemplate,
      }

      const existingSlugs = users.filter((user) => user.id !== currentUser.id).map((user) => user.profile.slug)
      const nextSlug = uniqueSlug(normalizedProfile.slug, existingSlugs, currentUser.name)

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 15000)

      let response: Response

      try {
        response = await authFetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            fullName: normalizedProfile.fullName,
            professionalTitle: normalizedProfile.professionalTitle,
            bio: normalizedProfile.bio,
            location: normalizedProfile.location,
            language: normalizedProfile.language,
            slug: nextSlug,
            bannerUrl: normalizedProfile.bannerUrl,
            photoUrl: normalizedProfile.photoUrl,
            videoUrls: normalizedProfile.videoUrls,
            editTools: normalizedProfile.editTools,
            videoStyles: normalizedProfile.videoStyles,
            contactMethod: normalizedProfile.contactMethod,
            contactValue: normalizedProfile.contactValue,
            themeColors: normalizedProfile.themeColors,
            portfolioTemplate: normalizedProfile.portfolioTemplate,
          }),
        })
      } catch (error) {
        window.clearTimeout(timeoutId)
        if (error instanceof Error && error.name === "AbortError") {
          return { success: false, message: "O salvamento demorou demais. Tente novamente." }
        }
        return {
          success: false,
          message: error instanceof Error ? error.message : "Não foi possível salvar seu perfil.",
        }
      }

      window.clearTimeout(timeoutId)

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        profile?: Record<string, unknown>
      }

      if (!response.ok || !payload.profile) {
        const message = payload.error ?? "Não foi possível salvar seu perfil."
        if (message.toLowerCase().includes("duplicate key value") || message.toLowerCase().includes("duplicate")) {
          return { success: false, message: "Este link público já está sendo usado por outro perfil." }
        }
        return { success: false, message }
      }

      const mappedUser = mapProfileToAppUser(payload.profile)
      setCurrentUser(mappedUser)
      setUsers([mappedUser])
      return { success: true, message: "Perfil atualizado com sucesso.", profile: mappedUser.profile }
    }

    const slugAlreadyInUse = users.some(
      (user) =>
        user.id !== currentUser.id &&
        user.profile.slug.toLowerCase() === profile.slug.trim().toLowerCase()
    )

    if (slugAlreadyInUse) {
      return { success: false, message: "Este link público já está sendo usado por outro perfil." }
    }

    const existingSlugs = users
      .filter((user) => user.id !== currentUser.id)
      .map((user) => user.profile.slug)

    const nextSlug = uniqueSlug(profile.slug, existingSlugs, currentUser.name)

    setUsers((prev) =>
      prev.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              name: profile.fullName,
              profile: {
                ...profile,
                slug: nextSlug,
              },
            }
          : user
      )
    )

    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            name: profile.fullName,
            profile: {
              ...profile,
              slug: nextSlug,
            },
          }
        : prev
    )

    return {
      success: true,
      message: "Perfil atualizado com sucesso.",
      profile: {
        ...profile,
        slug: nextSlug,
      },
    }
  }

  const createJob = async (payload: JobPayload) => {
    if (!currentUser) {
      return { success: false, message: "Faça login para publicar vagas." }
    }

    if (!isPublisherEmail(currentUser.email)) {
      return { success: false, message: "Seu usuário não tem permissão para publicar vagas." }
    }

    if (isSupabaseConfigured) {
      const response = await authFetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: payload.title,
          company: payload.company,
          location: payload.location,
          format: payload.format,
          salary: payload.salary,
          description: serializeJobDescription(payload.description, payload.referenceLink),
          referenceLink: payload.referenceLink,
          contact: payload.contact,
          status: "open",
        }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        return { success: false, message: result.error ?? "Não foi possível publicar a vaga." }
      }

      await loadSupabaseJobs(currentUser)
      return { success: true, message: "Vaga publicada com sucesso." }
    }

    const newJob: JobPost = {
      id: crypto.randomUUID(),
      ...payload,
      description: payload.description.trim(),
      referenceLink: payload.referenceLink.trim(),
      publishedById: currentUser.id,
      publishedBy: currentUser.email,
      status: "open",
      createdAt: new Date().toISOString(),
    }

    setJobs((prev) => [newJob, ...prev])
    return { success: true, message: "Vaga publicada com sucesso." }
  }

  const deleteJob = async (jobId: string) => {
    if (!currentUser) return

    if (isSupabaseConfigured) {
      const response = await authFetch("/api/jobs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: jobId }),
      })

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(result.error ?? "Não foi possível remover a vaga.")
      }

      await loadSupabaseJobs(currentUser)
      return
    }

    setJobs((prev) => prev.filter((job) => job.id !== jobId))
  }

  const updateJobStatus = async (jobId: string, status: JobStatus) => {
    if (!currentUser) {
      return { success: false, message: "Faça login para alterar a vaga." }
    }

    if (isSupabaseConfigured) {
      const response = await authFetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: jobId, status }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        return { success: false, message: result.error ?? "Não foi possível atualizar a vaga." }
      }

      await loadSupabaseJobs(currentUser)
      return {
        success: true,
        message:
          status === "cancelled"
            ? "Job cancelled."
            : status === "found"
              ? "Job marked as filled."
              : "Job reopened.",
      }
    }

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId && job.publishedById === currentUser.id
          ? { ...job, status }
          : job
      )
    )

    return {
      success: true,
      message:
        status === "cancelled"
          ? "Vaga cancelada."
          : status === "found"
            ? "Vaga marcada como encontrada."
            : "Vaga reaberta.",
    }
  }

  const value = useMemo(
    () =>
      ({
        users,
        jobs,
        currentUser,
        isReady,
        registerUser,
        loginUser,
        sendEmailCode,
        verifyEmailCode,
        signInWithGoogle,
        logoutUser,
        updateCurrentUserPlan,
        refreshCurrentUser,
        saveCurrentUserProfile,
        createJob,
        deleteJob,
        updateJobStatus,
      }) satisfies AppContextValue,
    [users, jobs, currentUser, isReady]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppSession = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("useAppSession must be used within AppProvider")
  }

  return context
}
