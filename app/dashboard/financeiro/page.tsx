"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Trash2,
  AlertTriangle,
  BookOpen
} from "lucide-react"
import Link from "next/link"
import { useAppSession } from "@/components/app/app-provider"
import { FeedbackBanner } from "@/components/dashboard/feedback-banner"
import { PageEmptyState } from "@/components/dashboard/page-empty-state"
import { PageLoadingState } from "@/components/dashboard/page-loading-state"
import {
  createFinanceTransaction,
  createFixedExpense,
  deleteFinanceTransaction,
  deleteFixedExpense,
  fetchFinanceTransactions,
  fetchFixedExpenses,
  getCachedFinanceTransactions,
  getCachedFixedExpenses,
  getCachedWorkspaceClients,
  fetchWorkspaceClients,
  subscribeWorkspaceSync,
  type FinanceTransaction,
  type FixedExpense,
} from "@/lib/workspace-db"

export default function FinanceiroPage() {
  const { currentUser } = useAppSession()
  const [transacoes, setTransacoes] = useState<FinanceTransaction[]>([])
  const [clientes, setClientes] = useState<string[]>([])
  const [gastosFixos, setGastosFixos] = useState<FixedExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackError, setFeedbackError] = useState("")
  const [isSavingTransaction, setIsSavingTransaction] = useState(false)
  const [isSavingExpense, setIsSavingExpense] = useState(false)

  const [dialogTransacaoOpen, setDialogTransacaoOpen] = useState(false)
  const [dialogGastoFixoOpen, setDialogGastoFixoOpen] = useState(false)

  const [novaTransacao, setNovaTransacao] = useState({
    tipo: "entrada" as "entrada" | "saida",
    valor: "",
    descricao: "",
    categoria: "Freelance",
    cliente: ""
  })

  const [novoGastoFixo, setNovoGastoFixo] = useState({
    nome: "",
    valor: "",
    categoria: "Software"
  })

  const categoriasEntrada = ["Freelance", "Package", "Project", "Bonus", "Other"]
  const categoriasSaida = ["Software", "Equipment", "Infrastructure", "Courses", "Taxes", "Other"]

  useEffect(() => {
    if (!currentUser) return
    const cachedClients = getCachedWorkspaceClients(currentUser.id)
    const cachedTransactions = getCachedFinanceTransactions(currentUser.id)
    const cachedExpenses = getCachedFixedExpenses(currentUser.id)

    if (cachedClients) {
      setClientes(cachedClients.map((client) => client.nome))
    }

    if (cachedTransactions) {
      setTransacoes(cachedTransactions)
    }

    if (cachedExpenses) {
      setGastosFixos(cachedExpenses)
    }

    if (cachedClients && cachedTransactions && cachedExpenses) {
      setIsLoading(false)
    }

    const syncFinance = async (showLoader = false) => {
      try {
        if (showLoader) {
          setIsLoading(true)
        }
        setFeedbackError("")
        const [workspaceClients, workspaceTransactions, workspaceExpenses] = await Promise.all([
          fetchWorkspaceClients(currentUser.id),
          fetchFinanceTransactions(currentUser.id),
          fetchFixedExpenses(currentUser.id),
        ])

        setClientes(workspaceClients.map((client) => client.nome))
        setTransacoes(workspaceTransactions)
        setGastosFixos(workspaceExpenses)
      } catch (error) {
        console.error(error)
        setFeedbackError(error instanceof Error ? error.message : "Não foi possível carregar os dados financeiros.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!cachedClients || !cachedTransactions || !cachedExpenses) {
      void syncFinance(true)
    } else {
      void syncFinance()
    }

    return subscribeWorkspaceSync(() => {
      const nextClients = getCachedWorkspaceClients(currentUser.id)
      const nextTransactions = getCachedFinanceTransactions(currentUser.id)
      const nextExpenses = getCachedFixedExpenses(currentUser.id)

      if (nextClients) {
        setClientes(nextClients.map((client) => client.nome))
      }

      if (nextTransactions) {
        setTransacoes(nextTransactions)
      }

      if (nextExpenses) {
        setGastosFixos(nextExpenses)
      }
    })
  }, [currentUser])

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente === novaTransacao.cliente) ?? "",
    [clientes, novaTransacao.cliente]
  )

  const totalEntradas = transacoes
    .filter(t => t.tipo === "entrada")
    .reduce((sum, t) => sum + t.valor, 0)

  const totalSaidas = transacoes
    .filter(t => t.tipo === "saida")
    .reduce((sum, t) => sum + t.valor, 0)

  const totalGastosFixos = gastosFixos.reduce((sum, g) => sum + g.valor, 0)

  const saldoLiquido = totalEntradas - totalSaidas - totalGastosFixos
  const isNegativo = saldoLiquido < 0
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value)
  }

  const financeSummary = [
    {
      label: "Entradas",
      value: formatCurrency(totalEntradas),
      hint: "Tudo que entrou no caixa",
      tone: "text-primary",
      icon: TrendingUp,
    },
    {
      label: "Saídas variáveis",
      value: formatCurrency(totalSaidas),
      hint: "Gastos operacionais e de projeto",
      tone: "text-red-400",
      icon: TrendingDown,
    },
    {
      label: "Custos fixos",
      value: formatCurrency(totalGastosFixos),
      hint: "Despesas recorrentes do mês",
      tone: "text-yellow-400",
      icon: DollarSign,
    },
    {
      label: "Saldo líquido",
      value: formatCurrency(saldoLiquido),
      hint: isNegativo ? "Negativo depois das despesas" : "Disponível depois das despesas",
      tone: isNegativo ? "text-red-400" : "text-foreground",
      icon: DollarSign,
    },
  ]

  const handleAddTransacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setFeedbackError("Faça login novamente para adicionar uma transação.")
      return
    }

    setIsSavingTransaction(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const transacao = await createFinanceTransaction(currentUser.id, {
        tipo: novaTransacao.tipo,
        valor: parseFloat(novaTransacao.valor),
        descricao: novaTransacao.descricao.trim(),
        categoria: novaTransacao.categoria,
        cliente: novaTransacao.cliente,
        data: new Date().toISOString(),
      })
      setTransacoes((prev) => [transacao, ...prev])
      setNovaTransacao({ tipo: "entrada", valor: "", descricao: "", categoria: "Freelance", cliente: "" })
      setDialogTransacaoOpen(false)
      setFeedbackMessage("Transação adicionada com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível salvar a transação.")
    } finally {
      setIsSavingTransaction(false)
    }
  }

  const handleAddGastoFixo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setFeedbackError("Faça login novamente para adicionar um gasto fixo.")
      return
    }

    setIsSavingExpense(true)
    setFeedbackMessage("")
    setFeedbackError("")

    try {
      const gasto = await createFixedExpense(currentUser.id, {
        nome: novoGastoFixo.nome.trim(),
        valor: parseFloat(novoGastoFixo.valor),
        categoria: novoGastoFixo.categoria,
      })
      setGastosFixos((prev) => [gasto, ...prev])
      setNovoGastoFixo({ nome: "", valor: "", categoria: "Software" })
      setDialogGastoFixoOpen(false)
      setFeedbackMessage("Gasto fixo adicionado com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível salvar o gasto fixo.")
    } finally {
      setIsSavingExpense(false)
    }
  }

  const handleDeleteTransacao = async (id: string) => {
    if (!currentUser) return
    try {
      setFeedbackMessage("")
      setFeedbackError("")
      await deleteFinanceTransaction(currentUser.id, id)
      setTransacoes((prev) => prev.filter((t) => t.id !== id))
      setFeedbackMessage("Transação removida com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível remover a transação.")
    }
  }

  const handleDeleteGastoFixo = async (id: string) => {
    if (!currentUser) return
    try {
      setFeedbackMessage("")
      setFeedbackError("")
      await deleteFixedExpense(currentUser.id, id)
      setGastosFixos((prev) => prev.filter((g) => g.id !== id))
      setFeedbackMessage("Gasto fixo removido com sucesso.")
    } catch (error) {
      console.error(error)
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível remover o gasto fixo.")
    }
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(date))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Finanças</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Uma visão clara do que entrou, do que saiu e do que realmente sobra depois dos custos fixos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            Pense nesta página como um caderno calmo de caixa, não como um painel barulhento.
          </div>
          <Dialog open={dialogTransacaoOpen} onOpenChange={setDialogTransacaoOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Nova transação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Nova transação</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Adicione uma entrada ou saída
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTransacao} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNovaTransacao({ ...novaTransacao, tipo: "entrada", categoria: "Freelance", cliente: "" })}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        novaTransacao.tipo === "entrada"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <ArrowUpRight className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Entrada</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovaTransacao({ ...novaTransacao, tipo: "saida", categoria: "Software", cliente: "" })}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        novaTransacao.tipo === "saida"
                          ? "border-red-500 bg-red-500/10 text-red-400"
                          : "border-border bg-background text-muted-foreground hover:border-red-500/50"
                      }`}
                    >
                      <ArrowDownRight className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Saída</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Valor</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={novaTransacao.valor}
                      onChange={(e) => setNovaTransacao({ ...novaTransacao, valor: e.target.value })}
                      placeholder="0.00"
                      className="bg-background border-border pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Descrição</Label>
                  <Input
                    value={novaTransacao.descricao}
                    onChange={(e) => setNovaTransacao({ ...novaTransacao, descricao: e.target.value })}
                    placeholder="Ex: Edição de vídeo para cliente X"
                    className="bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Categoria</Label>
                  <Select
                    value={novaTransacao.categoria}
                    onValueChange={(value) => setNovaTransacao({ ...novaTransacao, categoria: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {(novaTransacao.tipo === "entrada" ? categoriasEntrada : categoriasSaida).map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {novaTransacao.tipo === "entrada" && (
                    <>
                      <Label className="text-foreground">Cliente</Label>
                      <Select
                        value={novaTransacao.cliente || "no-client"}
                        onValueChange={(value) =>
                          setNovaTransacao({ ...novaTransacao, cliente: value === "no-client" ? "" : value })
                        }
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Selecione um cliente se quiser" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="no-client">Nenhum cliente vinculado</SelectItem>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {clienteSelecionado
                          ? `Pagamento vinculado a ${clienteSelecionado}.`
                          : clientes.length > 0
                            ? "Você também pode adicionar uma entrada sem vincular cliente."
                            : "Adicione clientes na área de Clientes para vê-los aqui."}
                      </p>
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={
                    isSavingTransaction ||
                    !novaTransacao.valor ||
                    !novaTransacao.descricao.trim()
                  }
                >
                  {isSavingTransaction ? "Salvando..." : "Adicionar transação"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <FeedbackBanner message={feedbackMessage} type="success" />
      <FeedbackBanner message={feedbackError} type="error" />

      {isLoading && (
        <PageLoadingState
          title="Carregando finanças"
          description="Estamos reunindo transações, clientes e custos fixos para mostrar seu caixa."
        />
      )}

      {/* Alerta de Saldo Negativo */}
      {!isLoading && isNegativo && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-medium text-red-400">Saldo negativo</h3>
                <p className="text-sm text-red-400/70">
                  Seus gastos estão maiores que suas entradas neste período
                </p>
              </div>
            </div>
            <Link href="/dashboard/prospeccao">
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                <BookOpen className="w-4 h-4 mr-2" />
                Ver guia de prospecção
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {financeSummary.map((item) => (
            <Card key={item.label} className="border-border bg-card/90">
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className={`text-2xl font-semibold ${item.tone}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-2.5">
                  <item.icon className={`h-4 w-4 ${item.tone}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Transações */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Transações recentes</CardTitle>
              <CardDescription className="text-muted-foreground">
                Histórico de entradas e saídas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transacoes.length === 0 ? (
                <PageEmptyState
                  icon={<TrendingUp className="h-7 w-7" />}
                  title="Nenhuma transação por enquanto"
                  description="Adicione sua primeira entrada ou saída para começar a acompanhar o caixa com clareza."
                  actionLabel="Nova transação"
                  onAction={() => setDialogTransacaoOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {transacoes.map((transacao) => (
                    <div
                      key={transacao.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transacao.tipo === "entrada" 
                            ? "bg-primary/20" 
                            : "bg-red-500/20"
                        }`}>
                          {transacao.tipo === "entrada" ? (
                            <ArrowUpRight className="w-5 h-5 text-primary" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{transacao.descricao}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                              {transacao.categoria}
                            </Badge>
                            {transacao.cliente && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                {transacao.cliente}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(transacao.data)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${
                          transacao.tipo === "entrada" ? "text-primary" : "text-red-400"
                        }`}>
                          {transacao.tipo === "entrada" ? "+" : "-"}{formatCurrency(transacao.valor)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDeleteTransacao(transacao.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gastos Fixos */}
        <div>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
              <CardTitle className="text-foreground">Gastos fixos</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Custos recorrentes do mês
                </CardDescription>
              </div>
              <Dialog open={dialogGastoFixoOpen} onOpenChange={setDialogGastoFixoOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 border-border">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Novo gasto fixo</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Adicione uma despesa recorrente mensal
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddGastoFixo} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Nome</Label>
                      <Input
                        value={novoGastoFixo.nome}
                        onChange={(e) => setNovoGastoFixo({ ...novoGastoFixo, nome: e.target.value })}
                        placeholder="Ex: Adobe Creative Cloud"
                        className="bg-background border-border"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Valor mensal</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={novoGastoFixo.valor}
                          onChange={(e) => setNovoGastoFixo({ ...novoGastoFixo, valor: e.target.value })}
                          placeholder="0.00"
                          className="bg-background border-border pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Categoria</Label>
                      <Select
                        value={novoGastoFixo.categoria}
                        onValueChange={(value) => setNovoGastoFixo({ ...novoGastoFixo, categoria: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Selecione uma" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {categoriasSaida.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={
                          isSavingExpense ||
                          !novoGastoFixo.nome.trim() ||
                          !novoGastoFixo.valor
                        }
                    >
                      {isSavingExpense ? "Salvando..." : "Adicionar gasto fixo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {gastosFixos.length === 0 ? (
                <PageEmptyState
                  icon={<DollarSign className="h-7 w-7" />}
                  title="Nenhum gasto fixo por enquanto"
                  description="Cadastre custos recorrentes como software, infraestrutura ou impostos para acompanhar seu saldo real."
                  actionLabel="Novo gasto fixo"
                  onAction={() => setDialogGastoFixoOpen(true)}
                />
              ) : (
                <div className="space-y-2">
                  {gastosFixos.map((gasto) => (
                    <div
                      key={gasto.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{gasto.nome}</p>
                        <p className="text-xs text-muted-foreground">{gasto.categoria}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-yellow-400 text-sm">
                          {formatCurrency(gasto.valor)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDeleteGastoFixo(gasto.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total mensal</span>
                      <span className="font-bold text-yellow-400">{formatCurrency(totalGastosFixos)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>}
    </div>
  )
}
