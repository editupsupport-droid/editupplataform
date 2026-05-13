"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    const finishGoogleLogin = async () => {
      if (!isSupabaseConfigured) {
        setErrorMessage("Supabase não configurado. Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
        return
      }

      const providerError = searchParams.get("error_description") || searchParams.get("error")

      if (providerError) {
        setErrorMessage(decodeURIComponent(providerError))
        return
      }

      const code = searchParams.get("code")
      const supabase = getSupabaseClient()

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          setErrorMessage(error.message)
          return
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setErrorMessage("Não encontramos a sessão do Google. Tente entrar novamente.")
          return
        }
      }

      if (!isMounted) return

      router.replace("/dashboard")
      router.refresh()
    }

    void finishGoogleLogin()

    return () => {
      isMounted = false
    }
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        {errorMessage ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              !
            </div>
            <h1 className="text-xl font-semibold">Não foi possível entrar</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Tentar novamente</Link>
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Finalizando seu login</h1>
            <p className="mt-2 text-sm text-muted-foreground">Estamos conectando sua conta Google à EditUp.</p>
          </>
        )}
      </section>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
