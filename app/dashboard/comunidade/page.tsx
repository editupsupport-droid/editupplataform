"use client"

import Link from "next/link"
import { MessageCircleMore, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const communityLinks = [
  {
    title: "Discord community",
    description: "Entre no servidor privado para conversar com outros editores, tirar dúvidas e acompanhar novidades.",
    href: "https://discord.gg/UU8VAqHfvR",
    icon: Users,
  },
  {
    title: "Grupo do WhatsApp",
    description: "Receba avisos rápidos, troque experiências e acompanhe oportunidades da comunidade.",
    href: "https://chat.whatsapp.com/Fofp6grErIZEZmSkfc7hHG?mode=hqctcli",
    icon: MessageCircleMore,
  },
]

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Comunidade</h1>
        <p className="mt-1 text-muted-foreground">Acesse os grupos oficiais da EditUp.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {communityLinks.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.href} className="rounded-xl border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-foreground">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full rounded-lg">
                  <Link href={item.href} target="_blank" rel="noreferrer">
                    Abrir comunidade
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
