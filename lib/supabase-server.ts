import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const createUserScopedServerClient = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const authorization = request.headers.get("authorization")

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase não configurado.")
  }

  if (!authorization) {
    throw new Error("Não autenticado.")
  }

  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Cabeçalho de autenticação inválido.")
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const requireAuthenticatedUser = async (request: NextRequest) => {
  const supabase = createUserScopedServerClient(request)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Não autenticado.")
  }

  return { supabase, user }
}

export const requireOwnedResource = async (
  supabase: ReturnType<typeof createUserScopedServerClient>,
  {
    table,
    id,
    ownerColumn = "user_id",
    userId,
  }: {
    table: string
    id: string
    ownerColumn?: string
    userId: string
  }
) => {
  const { data, error } = await supabase
    .from(table)
    .select(`id,${ownerColumn}`)
    .eq("id", id)
    .eq(ownerColumn, userId)
    .maybeSingle()

  if (error) {
    throw new Error("Não foi possível validar a permissão do recurso.")
  }

  if (!data) {
    throw new Error("FORBIDDEN_RESOURCE")
  }

  return data
}
