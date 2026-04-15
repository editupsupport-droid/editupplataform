"use client"

import Link from "next/link"
import { MessageCircleMore, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ComunidadePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Comunidade Exclusiva</h1>
        <p className="mt-1 text-muted-foreground">
          Entre nos grupos oficiais para networking, suporte, feedbacks e oportunidades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Comunidade Discord
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Canal principal para networking, trocas com outros editores e avisos importantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="https://discord.gg/P4x7DKEGnJ" target="_blank">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Entrar no Discord
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageCircleMore className="h-5 w-5 text-primary" />
              Grupo WhatsApp
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Grupo para avisos rápidos, networking e acompanhamento mais próximo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="https://chat.whatsapp.com/GCyIOZBGhYKAJ6sLvpYEUf?mode=gi_t" target="_blank">
              <Button variant="outline" className="w-full border-border">
                Entrar no WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
