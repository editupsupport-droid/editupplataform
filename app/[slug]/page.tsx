"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Mail, MessageCircle, Phone, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CONTACT_METHOD_LABELS,
  EDIT_TOOL_LABELS,
  parseBannerAssets,
  parseVideoUrls,
  VIDEO_STYLE_LABELS,
} from "@/lib/app-data"

interface PublicProfileData {
  full_name: string
  professional_title: string
  bio: string
  location: string
  banner_url: string
  video_url: string
  edit_tools: string[]
  video_styles: string[]
  contact_method: keyof typeof CONTACT_METHOD_LABELS
  contact_value: string
}

const getEmbedUrl = (videoUrl: string) => {
  if (!videoUrl) return null

  const youtubeMatch = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/
  )
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }

  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return null
}

const getContactHref = (method: keyof typeof CONTACT_METHOD_LABELS, value: string) => {
  if (method === "email") return `mailto:${value}`
  if (method === "phone") return `tel:${value.replace(/\s+/g, "")}`
  return `https://instagram.com/${value.replace("@", "")}`
}

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>()
  const slug = typeof params.slug === "string" ? params.slug : ""
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!slug) {
        setIsReady(true)
        return
      }

      const response = await fetch(`/api/public-profile/${slug}`)

      if (!response.ok) {
        setProfile(null)
        setIsReady(true)
        return
      }

      const data = (await response.json()) as PublicProfileData
      setProfile(data)
      setIsReady(true)
    }

    loadProfile()
  }, [slug])

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardContent className="space-y-4 p-8 text-center">
            <h1 className="text-2xl font-bold text-foreground">Perfil não encontrado</h1>
            <p className="text-muted-foreground">
              Esse link profissional ainda não existe ou não foi publicado.
            </p>
            <Link href="/">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Voltar para o início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const normalizedProfile = {
    fullName: profile.full_name,
    professionalTitle: profile.professional_title,
    bio: profile.bio,
    location: profile.location,
    ...parseBannerAssets(profile.banner_url),
    videoUrls: parseVideoUrls(profile.video_url),
    editTools: profile.edit_tools ?? [],
    videoStyles: profile.video_styles ?? [],
    contactMethod: profile.contact_method,
    contactValue: profile.contact_value,
  }
  const contactHref = getContactHref(normalizedProfile.contactMethod, normalizedProfile.contactValue)

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div
            className="min-h-52 border-b border-border bg-secondary bg-cover bg-center"
            style={normalizedProfile.bannerUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.75)), url(${normalizedProfile.bannerUrl})` } : undefined}
          >
            <div className="flex min-h-52 items-end px-6 py-8 lg:px-10">
              <div className="space-y-3">
                <div
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary bg-cover bg-center text-2xl font-bold text-primary-foreground"
                  style={normalizedProfile.photoUrl ? { backgroundImage: `url(${normalizedProfile.photoUrl})` } : undefined}
                >
                  {!normalizedProfile.photoUrl && normalizedProfile.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground lg:text-4xl">{normalizedProfile.fullName}</h1>
                  <p className="text-lg text-muted-foreground">{normalizedProfile.professionalTitle}</p>
                  {normalizedProfile.location && <p className="mt-1 text-sm text-muted-foreground">{normalizedProfile.location}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr,0.8fr] lg:p-10">
            <div className="space-y-6">
              <Card className="border-border bg-background">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-foreground">Sobre</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {normalizedProfile.bio || "Esse editor ainda não adicionou uma biografia ao perfil profissional."}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-background">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Vídeos</h2>
                  </div>
                  {normalizedProfile.videoUrls.some(Boolean) ? (
                    <div className="space-y-4">
                      {normalizedProfile.videoUrls.filter(Boolean).map((videoUrl, index) => {
                        const embedUrl = getEmbedUrl(videoUrl)

                        if (embedUrl) {
                          return (
                            <div key={`${videoUrl}-${index}`} className="aspect-video overflow-hidden rounded-2xl border border-border">
                              <iframe
                                src={embedUrl}
                                title={`Vídeo ${index + 1} de ${normalizedProfile.fullName}`}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )
                        }

                        return (
                          <Link
                            key={`${videoUrl}-${index}`}
                            href={videoUrl}
                            target="_blank"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            Abrir vídeo {index + 1}
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum vídeo foi adicionado por enquanto.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border bg-background">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-foreground">Ferramentas</h2>
                  <div className="flex flex-wrap gap-2">
                    {normalizedProfile.editTools.length > 0 ? (
                      normalizedProfile.editTools.map((tool) => <Badge key={tool} variant="secondary">{EDIT_TOOL_LABELS[tool as keyof typeof EDIT_TOOL_LABELS]}</Badge>)
                    ) : (
                      <span className="text-sm text-muted-foreground">Ferramentas não informadas.</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-background">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-foreground">Estilo de edição</h2>
                  <div className="flex flex-wrap gap-2">
                    {normalizedProfile.videoStyles.length > 0 ? (
                      normalizedProfile.videoStyles.map((style) => <Badge key={style} variant="secondary">{VIDEO_STYLE_LABELS[style as keyof typeof VIDEO_STYLE_LABELS]}</Badge>)
                    ) : (
                      <span className="text-sm text-muted-foreground">Estilo não informado.</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-background">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-foreground">Contato principal</h2>
                  <p className="text-sm text-muted-foreground">
                    {CONTACT_METHOD_LABELS[normalizedProfile.contactMethod]}: {normalizedProfile.contactValue || "Não informado"}
                  </p>
                  <Link href={contactHref} target="_blank">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {normalizedProfile.contactMethod === "email" ? (
                        <Mail className="mr-2 h-4 w-4" />
                      ) : normalizedProfile.contactMethod === "phone" ? (
                        <Phone className="mr-2 h-4 w-4" />
                      ) : (
                        <MessageCircle className="mr-2 h-4 w-4" />
                      )}
                      Falar com {normalizedProfile.fullName.split(" ")[0]}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
