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
  parseVideoUrls,
  seededJobs,
  seededUsers,
  serializeBannerAssets,
  serializeVideoUrls,
  uniqueSlug,
} from "@/lib/app-data"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"

const USERS_STORAGE_KEY = "editpro-users"
const JOBS_STORAGE_KEY = "editpro-jobs"
const SESSION_STORAGE_KEY = "editpro-current-user"

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
  contact: string
}

interface AppContextValue {
  users: AppUser[]
  jobs: JobPost[]
  currentUser: AppUser | null
  isReady: boolean
  registerUser: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>
  loginUser: (email: string, password: string) => Promise<{ success: boolean; message?: string; requiresCode?: boolean }>
  sendEmailCode: (email: string, shouldCreateUser?: boolean) => Promise<{ success: boolean; message?: string }>
  verifyEmailCode: (email: string, token: string) => Promise<{ success: boolean; message?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>
  logoutUser: () => Promise<void>
  updateCurrentUserPlan: (plan: AppUser["plan"]) => Promise<{ success: boolean; message?: string }>
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

const mapProfileToAppUser = (profile: Record<string, unknown>): AppUser => {
  const bannerAssets = parseBannerAssets(profile.banner_url)
  const videoUrls = parseVideoUrls(profile.video_url)

  return {
    id: String(profile.id),
    name: String(profile.full_name ?? profile.email ?? "Editor"),
    email: String(profile.email ?? ""),
    password: "",
    plan: (profile.plan as AppUser["plan"]) ?? "free",
    createdAt: String(profile.created_at ?? new Date().toISOString()),
    profile: {
      fullName: String(profile.full_name ?? profile.email ?? "Editor"),
      professionalTitle: String(profile.professional_title ?? "Editor de vídeo"),
      bio: String(profile.bio ?? ""),
      location: String(profile.location ?? ""),
      slug: String(profile.slug ?? ""),
      bannerUrl: bannerAssets.bannerUrl,
      photoUrl: bannerAssets.photoUrl,
      videoUrls,
      editTools: normalizeTools(profile.edit_tools) as EditorProfile["editTools"],
      videoStyles: normalizeTools(profile.video_styles) as EditorProfile["videoStyles"],
      contactMethod: (profile.contact_method as EditorProfile["contactMethod"]) ?? "email",
      contactValue: String(profile.contact_value ?? profile.email ?? ""),
    },
  }
}

const mapJobRow = (
  job: Record<string, unknown>,
  publisherEmailById: Map<string, string>
): JobPost => ({
  id: String(job.id),
  title: String(job.title ?? ""),
  company: String(job.company ?? ""),
  location: String(job.location ?? ""),
  format: String(job.format ?? ""),
  salary: String(job.salary ?? ""),
  description: String(job.description ?? ""),
  contact: String(job.contact ?? ""),
  publishedBy: publisherEmailById.get(String(job.published_by)) ?? String(job.published_by ?? ""),
  status: (job.status as JobStatus) ?? "open",
  createdAt: String(job.created_at ?? new Date().toISOString()),
})

const isValidPlan = (value: unknown): value is PlanId =>
  value === "free" || value === "starter" || value === "essential"

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const syncPromiseRef = useRef(Promise.resolve())

  const checkEmailStatus = async (email: string) => {
    const response = await fetch("/api/auth/email-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    const data = (await response.json()) as { exists?: boolean; error?: string }

    if (!response.ok) {
      return { success: false, exists: false, message: data.error ?? "Não foi possível validar o e-mail." }
    }

    return { success: true, exists: Boolean(data.exists) }
  }

  const loadSupabaseJobs = async () => {
    const response = await fetch("/api/jobs", { cache: "no-store" })
    const payload = (await response.json()) as { jobs?: Array<Record<string, unknown>> }

    if (!response.ok || !payload.jobs) {
      setJobs([])
      return
    }

    const jobRows = payload.jobs
    const supabase = getSupabaseClient()
    const publisherIds = Array.from(new Set(jobRows.map((job) => String(job.published_by))))
    const { data: profiles } = publisherIds.length
      ? await supabase
          .from("profiles")
          .select("id, email")
          .in("id", publisherIds)
      : { data: [] as Array<{ id: string; email: string }> }

    const publisherEmailById = new Map(
      (profiles ?? []).map((profile) => [String(profile.id), String(profile.email)])
    )

    setJobs(jobRows.map((job) => mapJobRow(job, publisherEmailById)))
  }

  const refreshSupabaseStateByUserId = async (userId: string) => {
    const supabase = getSupabaseClient()
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error || !profile) {
      setCurrentUser(null)
      setUsers([])
      setJobs([])
      return
    }

    const mappedUser = mapProfileToAppUser(profile)
    setCurrentUser(mappedUser)
    setUsers([mappedUser])
    await loadSupabaseJobs()
  }

  const ensureSupabaseProfile = async (authUser: User) => {
    const supabase = getSupabaseClient()
    const normalizedEmail = authUser.email?.trim().toLowerCase() ?? ""
    const fallbackName =
      typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name.trim()
        ? authUser.user_metadata.name.trim()
        : normalizedEmail.split("@")[0] || "Editor"

    const defaultProfile = createDefaultProfile(fallbackName, normalizedEmail, [])
    const profilePayload = {
      id: authUser.id,
      email: normalizedEmail,
      full_name: fallbackName,
      professional_title: defaultProfile.professionalTitle,
      bio: defaultProfile.bio,
      location: defaultProfile.location,
      slug: defaultProfile.slug,
      banner_url: serializeBannerAssets(defaultProfile.bannerUrl, defaultProfile.photoUrl),
      video_url: serializeVideoUrls(defaultProfile.videoUrls),
      edit_tools: defaultProfile.editTools,
      video_styles: defaultProfile.videoStyles,
      contact_method: defaultProfile.contactMethod,
      contact_value: normalizedEmail,
      plan: getDefaultPlanForEmail(normalizedEmail),
      can_publish_jobs: getDefaultPublishPermission(normalizedEmail),
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle()

    if (!existingProfile) {
      await supabase.from("profiles").insert(profilePayload)
      return
    }

    const updates: Record<string, unknown> = {}

    if (!existingProfile.email && normalizedEmail) {
      updates.email = normalizedEmail
    }

    if (!existingProfile.full_name && fallbackName) {
      updates.full_name = fallbackName
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
      await supabase.from("profiles").update(updates).eq("id", authUser.id)
    }
  }

  const syncSupabaseUser = async (authUser: User | null) => {
    if (!authUser) {
      setCurrentUser(null)
      setUsers([])
      setJobs([])
      return
    }

    const supabase = getSupabaseClient()
    await ensureSupabaseProfile(authUser)
    await refreshSupabaseStateByUserId(authUser.id)
  }

  const queueSupabaseSync = (authUser: User | null) => {
    syncPromiseRef.current = syncPromiseRef.current
      .catch(() => undefined)
      .then(() => syncSupabaseUser(authUser))
      .catch((error) => {
        console.error("Falha ao sincronizar sessao do Supabase:", error)
        setCurrentUser(null)
        setUsers([])
        setJobs([])
      })

    return syncPromiseRef.current
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient()
      let isMounted = true

      const bootstrap = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        await queueSupabaseSync(session?.user ?? null)
        if (isMounted) {
          setIsReady(true)
        }
      }

      void bootstrap()

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        await queueSupabaseSync(session?.user ?? null)
        if (isMounted) {
          setIsReady(true)
        }
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

  const registerUser = async ({ name, email, password }: RegisterPayload) => {
    if (isSupabaseConfigured) {
      const normalizedEmail = email.trim().toLowerCase()
      const emailStatus = await checkEmailStatus(normalizedEmail)

      if (!emailStatus.success) {
        return { success: false, message: emailStatus.message }
      }

      if (emailStatus.exists) {
        if (canDirectLoginEmail(normalizedEmail)) {
          const { error } = await getSupabaseClient().auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })

          if (error) {
            return { success: false, message: error.message }
          }

          return { success: true, message: "Conta reconhecida e login realizado." }
        }

        return { success: false, message: "Esse e-mail já está cadastrado. Entre pela tela de login." }
      }

      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      })

      if (error) {
        return { success: false, message: error.message }
      }

      const otpResult = await sendEmailCode(normalizedEmail, false)
      return {
        success: otpResult.success,
        message: otpResult.message,
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
    return { success: true }
  }

  const loginUser = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()

      if (canDirectLoginEmail(normalizedEmail)) {
        const { error } = await getSupabaseClient().auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })

        if (error) {
          return { success: false, message: error.message, requiresCode: false }
        }

        return { success: true, requiresCode: false }
      }

      const emailStatus = await checkEmailStatus(normalizedEmail)

      if (!emailStatus.success) {
        return { success: false, message: emailStatus.message, requiresCode: false }
      }

      if (!emailStatus.exists) {
        return {
          success: false,
          message: "Esse e-mail ainda não está cadastrado. Crie sua conta primeiro.",
          requiresCode: false,
        }
      }

      const supabase = getSupabaseClient()
      const passwordValidation = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })

      if (passwordValidation.error) {
        return {
          success: false,
          message: "E-mail ou senha inválidos.",
          requiresCode: false,
        }
      }

      await supabase.auth.signOut()

      const result = await sendEmailCode(normalizedEmail, false)
      return {
        ...result,
        requiresCode: result.success,
      }
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

    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser,
      },
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, message: "Código enviado para o seu e-mail." }
  }

  const verifyEmailCode = async (email: string, token: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: "Supabase não configurado para validação." }
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { success: false, message: "Supabase não configurado para Google login." }
    }

    const supabase = getSupabaseClient()
    const redirectTo = `${window.location.origin}/dashboard/calculadora`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
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
      return
    }

    setCurrentUser(null)
  }

  const updateCurrentUserPlan = async (plan: AppUser["plan"]) => {
    if (!currentUser) {
      return { success: false, message: "Faça login para alterar o plano." }
    }

    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient()
        .from("profiles")
        .update({ plan })
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
        slug: profile.slug.trim(),
        bannerUrl: profile.bannerUrl.trim(),
        photoUrl: profile.photoUrl.trim(),
        videoUrls: (profile.videoUrls ?? []).map((url) => url.trim()).filter(Boolean),
        editTools: [...new Set(profile.editTools ?? [])],
        videoStyles: [...new Set(profile.videoStyles ?? [])],
        contactValue: profile.contactValue.trim(),
      }

      const existingSlugs = users
        .filter((user) => user.id !== currentUser.id)
        .map((user) => user.profile.slug)

      const nextSlug = uniqueSlug(normalizedProfile.slug, existingSlugs, currentUser.name)
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          fullName: normalizedProfile.fullName,
          professionalTitle: normalizedProfile.professionalTitle,
          bio: normalizedProfile.bio,
          location: normalizedProfile.location,
          slug: nextSlug,
          bannerUrl: normalizedProfile.bannerUrl,
          photoUrl: normalizedProfile.photoUrl,
          videoUrls: normalizedProfile.videoUrls,
          editTools: normalizedProfile.editTools,
          videoStyles: normalizedProfile.videoStyles,
          contactMethod: normalizedProfile.contactMethod,
          contactValue: normalizedProfile.contactValue,
        }),
      })

      const payload = (await response.json()) as { error?: string; profile?: Record<string, unknown> }

      if (!response.ok || !payload.profile) {
        const message = payload.error ?? "Não foi possível salvar o perfil."
        if (message.toLowerCase().includes("duplicate key value")) {
          return { success: false, message: "Esse link público já está sendo usado por outro perfil." }
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
      return { success: false, message: "Esse link já está sendo usado por outro perfil." }
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
      const response = await fetch("/api/jobs", {
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
          description: payload.description,
          contact: payload.contact,
          status: "open",
          published_by: currentUser.id,
        }),
      })
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        return { success: false, message: result.error ?? "Não foi possível publicar a vaga." }
      }

      await loadSupabaseJobs()
      return { success: true, message: "Vaga publicada com sucesso." }
    }

    const newJob: JobPost = {
      id: crypto.randomUUID(),
      ...payload,
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
      await fetch("/api/jobs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: jobId, userId: currentUser.id }),
      })
      await loadSupabaseJobs()
      return
    }

    setJobs((prev) => prev.filter((job) => job.id !== jobId))
  }

  const updateJobStatus = async (jobId: string, status: JobStatus) => {
    if (!currentUser) {
      return { success: false, message: "Faça login para alterar a vaga." }
    }

    if (isSupabaseConfigured) {
      const response = await fetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: jobId, status, userId: currentUser.id }),
      })
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        return { success: false, message: result.error ?? "Não foi possível atualizar a vaga." }
      }

      await loadSupabaseJobs()
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

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId && job.publishedBy === currentUser.email
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
