import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthenticatedUser } from "@/lib/supabase-server"
import { enforceRateLimit, ensureTrustedOrigin, sanitizePlainText } from "@/lib/security"

export const runtime = "nodejs"
const transactionColumns = "id,user_id,kind,amount,description,category,client_name,transaction_date,created_at,updated_at"
const expenseColumns = "id,user_id,name,amount,category,created_at,updated_at"

const transactionSchema = z.object({
  type: z.literal("transaction"),
  kind: z.enum(["entrada", "saida"]),
  amount: z.number().positive().max(10_000_000),
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  clientName: z.string().trim().max(120).optional().nullable(),
  transactionDate: z.string().trim().min(1),
})

const expenseSchema = z.object({
  type: z.literal("expense"),
  name: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(10_000_000),
  category: z.string().trim().min(1).max(80),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["transaction", "expense"]),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const type = request.nextUrl.searchParams.get("type")

    if (type === "transactions") {
      const { data, error } = await supabase
        .from("finance_transactions")
        .select(transactionColumns)
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }

      return NextResponse.json({ items: data ?? [] })
    }

    if (type === "expenses") {
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select(expenseColumns)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }

      return NextResponse.json({ items: data ?? [] })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar o financeiro."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "finance:post", max: 100 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as Record<string, unknown>
    const type = String(body.type ?? "")

    if (type === "transaction") {
      const parsed = transactionSchema.parse(body)
      const payload = {
        user_id: user.id,
        kind: parsed.kind,
        amount: parsed.amount,
        description: sanitizePlainText(parsed.description),
        category: sanitizePlainText(parsed.category),
        client_name: parsed.clientName ? sanitizePlainText(parsed.clientName) : null,
        transaction_date: parsed.transactionDate,
      }

      const { data, error } = await supabase
        .from("finance_transactions")
        .insert(payload)
        .select(transactionColumns)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: "Não foi possível salvar a transação." }, { status: 400 })
      }

      return NextResponse.json({ item: data })
    }

    if (type === "expense") {
      const parsed = expenseSchema.parse(body)
      const payload = {
        user_id: user.id,
        name: sanitizePlainText(parsed.name),
        amount: parsed.amount,
        category: sanitizePlainText(parsed.category),
      }

      const { data, error } = await supabase
        .from("fixed_expenses")
        .insert(payload)
        .select(expenseColumns)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: "Não foi possível salvar o gasto fixo." }, { status: 400 })
      }

      return NextResponse.json({ item: data })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao salvar no financeiro."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = ensureTrustedOrigin(request)
    if (originError) return originError
    const rateLimitError = enforceRateLimit(request, { scope: "finance:delete", max: 80 })
    if (rateLimitError) return rateLimitError

    const { supabase, user } = await requireAuthenticatedUser(request)
    const { id, type } = deleteSchema.parse(await request.json())

    if (type === "transaction") {
      const { data, error } = await supabase
        .from("finance_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: "Erro ao remover item." }, { status: 400 })
      }

      if (!data) {
        return NextResponse.json({ error: "Transação não encontrada ou sem permissão." }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    if (type === "expense") {
      const { data, error } = await supabase
        .from("fixed_expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: "Erro ao remover item." }, { status: 400 })
      }

      if (!data) {
        return NextResponse.json({ error: "Gasto fixo não encontrado ou sem permissão." }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Erro ao remover item."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
