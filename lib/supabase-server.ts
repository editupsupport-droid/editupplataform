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
