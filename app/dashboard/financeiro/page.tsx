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
import {
  createFinanceTransaction,
  createFixedExpense,
  deleteFinanceTransaction,
  deleteFixedExpense,
  fetchFinanceTransactions,
  fetchFixedExpenses,
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

  const [dialogTransacaoOpen, setDialogTransacaoOpen] = useState(false)
  const [dialogGastoFixoOpen, setDialogGastoFixoOpen] = useState(false)

  const [novaTransacao, setNovaTransacao] = useState({
    tipo: "entrada" as "entrada" | "saida",
    valor: "",
    descricao: "",
    categoria: "",
    cliente: ""
  })

  const [novoGastoFixo, setNovoGastoFixo] = useState({
    nome: "",
    valor: "",
    categoria: ""
  })

  const categoriasEntrada = ["Freelance", "Pacote", "Projeto", "Bônus", "Outros"]
  const categoriasSaida = ["Software", "Equipamento", "Infraestrutura", "Cursos", "Impostos", "Outros"]

  useEffect(() => {
    if (!currentUser) return

    const syncFinance = async () => {
      try {
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
      }
    }

    void syncFinance()
    return subscribeWorkspaceSync(() => {
      void syncFinance()
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

  const handleAddTransacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    const transacao = await createFinanceTransaction(currentUser.id, {
      tipo: novaTransacao.tipo,
      valor: parseFloat(novaTransacao.valor),
      descricao: novaTransacao.descricao,
      categoria: novaTransacao.categoria,
      cliente: novaTransacao.cliente,
      data: new Date().toISOString(),
    })
    setTransacoes((prev) => [transacao, ...prev])
    setNovaTransacao({ tipo: "entrada", valor: "", descricao: "", categoria: "", cliente: "" })
    setDialogTransacaoOpen(false)
  }

  const handleAddGastoFixo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    const gasto = await createFixedExpense(currentUser.id, {
      nome: novoGastoFixo.nome,
      valor: parseFloat(novoGastoFixo.valor),
      categoria: novoGastoFixo.categoria,
    })
    setGastosFixos((prev) => [gasto, ...prev])
    setNovoGastoFixo({ nome: "", valor: "", categoria: "" })
    setDialogGastoFixoOpen(false)
  }

  const handleDeleteTransacao = async (id: string) => {
    if (!currentUser) return
    await deleteFinanceTransaction(currentUser.id, id)
    setTransacoes((prev) => prev.filter((t) => t.id !== id))
  }

  const handleDeleteGastoFixo = async (id: string) => {
    if (!currentUser) return
    await deleteFixedExpense(currentUser.id, id)
    setGastosFixos((prev) => prev.filter((g) => g.id !== id))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short"
    }).format(new Date(date))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle suas finanças de forma simples</p>
        </div>
        <Dialog open={dialogTransacaoOpen} onOpenChange={setDialogTransacaoOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova Transação</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Registre uma entrada ou saída
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTransacao} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Tipo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovaTransacao({ ...novaTransacao, tipo: "entrada", categoria: "", cliente: "" })}
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
                    onClick={() => setNovaTransacao({ ...novaTransacao, tipo: "saida", categoria: "", cliente: "" })}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novaTransacao.valor}
                    onChange={(e) => setNovaTransacao({ ...novaTransacao, valor: e.target.value })}
                    placeholder="0,00"
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
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(novaTransacao.tipo === "entrada" ? categoriasEntrada : categoriasSaida).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {novaTransacao.tipo === "entrada" && (
                <div className="space-y-2">
                  <Label className="text-foreground">Cliente</Label>
                  <Select
                    value={novaTransacao.cliente || "sem-cliente"}
                    onValueChange={(value) =>
                      setNovaTransacao({ ...novaTransacao, cliente: value === "sem-cliente" ? "" : value })
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Selecione o cliente, se quiser" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="sem-cliente">Sem cliente vinculado</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {clienteSelecionado
                      ? `Pagamento vinculado a ${clienteSelecionado}.`
                      : clientes.length > 0
                        ? "Você também pode registrar a entrada sem cliente vinculado."
                        : "Cadastre clientes na área de Clientes para eles aparecerem aqui."}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Adicionar Transação
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerta de Saldo Negativo */}
      {isNegativo && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-medium text-red-400">Saldo Negativo</h3>
                <p className="text-sm text-red-400/70">
                  Seus gastos estão maiores que suas entradas este mês
                </p>
              </div>
            </div>
            <Link href="/dashboard/prospeccao">
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                <BookOpen className="w-4 h-4 mr-2" />
                Ver Guia de Prospecção
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalEntradas)}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalSaidas)}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Fixos</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{formatCurrency(totalGastosFixos)}</div>
            <p className="text-xs text-muted-foreground">Mensal</p>
          </CardContent>
        </Card>

        <Card className={`border ${isNegativo ? "bg-red-500/10 border-red-500/30" : "bg-primary/10 border-primary/30"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${isNegativo ? "text-red-400" : "text-primary"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isNegativo ? "text-red-400" : "text-primary"}`}>
              {formatCurrency(saldoLiquido)}
            </div>
            <p className="text-xs text-muted-foreground">Após gastos fixos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Transações */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Transações Recentes</CardTitle>
              <CardDescription className="text-muted-foreground">
                Histórico de entradas e saídas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação registrada
                </div>
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
                <CardTitle className="text-foreground">Gastos Fixos</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Despesas mensais recorrentes
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
                    <DialogTitle className="text-foreground">Novo Gasto Fixo</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Adicione uma despesa mensal recorrente
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
                      <Label className="text-foreground">Valor Mensal</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={novoGastoFixo.valor}
                          onChange={(e) => setNovoGastoFixo({ ...novoGastoFixo, valor: e.target.value })}
                          placeholder="0,00"
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
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {categoriasSaida.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Adicionar Gasto Fixo
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {gastosFixos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum gasto fixo cadastrado
                </div>
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
                      <span className="text-sm text-muted-foreground">Total Mensal</span>
                      <span className="font-bold text-yellow-400">{formatCurrency(totalGastosFixos)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
