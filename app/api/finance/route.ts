import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser } from "@/lib/supabase-server"

export const runtime = "nodejs"
const transactionColumns = "id,user_id,kind,amount,description,category,client_name,transaction_date,created_at,updated_at"
const expenseColumns = "id,user_id,name,amount,category,created_at,updated_at"

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
    const { supabase, user } = await requireAuthenticatedUser(request)
    const body = (await request.json()) as Record<string, unknown>
    const type = String(body.type ?? "")

    if (type === "transaction") {
      const payload = {
        user_id: user.id,
        kind: body.kind,
        amount: body.amount,
        description: body.description,
        category: body.category,
        client_name: body.clientName ?? null,
        transaction_date: body.transactionDate,
      }

      const { data, error } = await supabase
        .from("finance_transactions")
        .insert(payload)
        .select(transactionColumns)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Não foi possível salvar a transação." }, { status: 400 })
      }

      return NextResponse.json({ item: data })
    }

    if (type === "expense") {
      const payload = {
        user_id: user.id,
        name: body.name,
        amount: body.amount,
        category: body.category,
      }

      const { data, error } = await supabase
        .from("fixed_expenses")
        .insert(payload)
        .select(expenseColumns)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Não foi possível salvar o gasto fixo." }, { status: 400 })
      }

      return NextResponse.json({ item: data })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar no financeiro."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request)
    const { id, type } = (await request.json()) as { id?: string; type?: string }

    if (!id || !type) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    if (type === "transaction") {
      const { data, error } = await supabase
        .from("finance_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
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
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      if (!data) {
        return NextResponse.json({ error: "Gasto fixo não encontrado ou sem permissão." }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item."
    return NextResponse.json({ error: message }, { status: message === "Não autenticado." ? 401 : 500 })
  }
}
