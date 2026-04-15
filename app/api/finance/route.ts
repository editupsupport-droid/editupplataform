import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const getConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase não configurado.")
  }

  return { supabaseUrl, serviceRoleKey }
}

const baseHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
})

const jsonHeaders = (serviceRoleKey: string) => ({
  ...baseHeaders(serviceRoleKey),
  "Content-Type": "application/json",
  Prefer: "return=representation",
})

export async function GET(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const userId = request.nextUrl.searchParams.get("userId")
    const type = request.nextUrl.searchParams.get("type")

    if (!userId || !type) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 })
    }

    if (type === "transactions") {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/finance_transactions?user_id=eq.${encodeURIComponent(userId)}&select=*&order=transaction_date.desc`,
        {
          headers: baseHeaders(serviceRoleKey),
          cache: "no-store",
        }
      )

      if (!response.ok) {
        return NextResponse.json({ error: "Não foi possível carregar as transações." }, { status: response.status })
      }

      return NextResponse.json({ items: await response.json() })
    }

    if (type === "expenses") {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/fixed_expenses?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
        {
          headers: baseHeaders(serviceRoleKey),
          cache: "no-store",
        }
      )

      if (!response.ok) {
        return NextResponse.json({ error: "Não foi possível carregar os gastos fixos." }, { status: response.status })
      }

      return NextResponse.json({ items: await response.json() })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar o financeiro."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const body = (await request.json()) as Record<string, unknown>
    const type = String(body.type ?? "")

    if (type === "transaction") {
      const response = await fetch(`${supabaseUrl}/rest/v1/finance_transactions`, {
        method: "POST",
        headers: jsonHeaders(serviceRoleKey),
        body: JSON.stringify({
          user_id: body.userId,
          kind: body.kind,
          amount: body.amount,
          description: body.description,
          category: body.category,
          client_name: body.clientName ?? null,
          transaction_date: body.transactionDate,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json({ error: errorText || "Não foi possível salvar a transação." }, { status: response.status })
      }

      const rows = (await response.json()) as Array<Record<string, unknown>>
      return NextResponse.json({ item: rows[0] ?? null })
    }

    if (type === "expense") {
      const response = await fetch(`${supabaseUrl}/rest/v1/fixed_expenses`, {
        method: "POST",
        headers: jsonHeaders(serviceRoleKey),
        body: JSON.stringify({
          user_id: body.userId,
          name: body.name,
          amount: body.amount,
          category: body.category,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json({ error: errorText || "Não foi possível salvar o gasto fixo." }, { status: response.status })
      }

      const rows = (await response.json()) as Array<Record<string, unknown>>
      return NextResponse.json({ item: rows[0] ?? null })
    }

    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar no financeiro."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseUrl, serviceRoleKey } = getConfig()
    const { id, userId, type } = (await request.json()) as { id?: string; userId?: string; type?: string }

    if (!id || !userId || !type) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const table = type === "transaction" ? "finance_transactions" : type === "expense" ? "fixed_expenses" : null

    if (!table) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: baseHeaders(serviceRoleKey),
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível remover o item." }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
