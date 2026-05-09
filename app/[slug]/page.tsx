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
  PROFILE_LANGUAGE_LABELS,
  VIDEO_STYLE_LABELS,
} from "@/lib/app-data"
import type { PortfolioTemplate } from "@/lib/app-data"
import { getExternalVideoEmbedUrl } from "@/lib/review-utils"

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

  const externalEmbedUrl = getExternalVideoEmbedUrl(videoUrl)
  if (externalEmbedUrl) return externalEmbedUrl

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
              Este link profissional ainda não existe ou ainda não foi publicado.
            </p>
            <Link href="/">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Voltar para a home
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
  const template = normalizedProfile.portfolioTemplate as PortfolioTemplate
  const isViral = template === "viral-creator"
  const isMinimal = template === "minimal-luxury"
  const pageStyle = {
    backgroundColor: normalizedProfile.themeColors.pageBackground,
    color: normalizedProfile.themeColors.textColor,
  }
  const cardStyle = {
    backgroundColor: normalizedProfile.themeColors.cardBackground,
    borderColor: `${normalizedProfile.themeColors.accentColor}40`,
  }

  return (
    <div className={`min-h-screen ${isMinimal ? "py-14" : "py-10"}`} style={pageStyle}>
      <div className={`mx-auto px-4 lg:px-8 ${isMinimal ? "max-w-4xl" : isViral ? "max-w-6xl" : "max-w-5xl"}`}>
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm hover:opacity-80" style={{ color: `${normalizedProfile.themeColors.textColor}B3` }}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <section className={`overflow-hidden border ${isMinimal ? "rounded-[2rem]" : "rounded-3xl"}`} style={cardStyle}>
          <div
            className={`${isViral ? "min-h-[24rem]" : "min-h-52"} border-b bg-secondary bg-cover bg-center`}
            style={{
              borderColor: `${normalizedProfile.themeColors.accentColor}40`,
              ...(normalizedProfile.bannerUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.75)), url(${normalizedProfile.bannerUrl})` } : {}),
            }}
          >
            <div className={`flex ${isViral ? "min-h-[24rem] items-center" : "min-h-52 items-end"} px-6 py-8 lg:px-10`}>
              <div className={`space-y-3 ${isViral ? "max-w-2xl" : ""}`}>
                <div
                  className={`flex items-center justify-center overflow-hidden bg-cover bg-center font-bold text-white ${isViral ? "h-24 w-24 rounded-3xl text-3xl" : "h-20 w-20 rounded-full text-2xl"}`}
                  style={normalizedProfile.photoUrl ? { backgroundImage: `url(${normalizedProfile.photoUrl})`, backgroundColor: normalizedProfile.themeColors.accentColor } : { backgroundColor: normalizedProfile.themeColors.accentColor }}
                >
                  {!normalizedProfile.photoUrl && normalizedProfile.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h1 className={`${isViral ? "text-5xl lg:text-7xl" : isMinimal ? "text-4xl lg:text-5xl" : "text-3xl lg:text-4xl"} font-bold tracking-tight`} style={{ color: normalizedProfile.themeColors.textColor }}>{normalizedProfile.fullName}</h1>
                  <p className={`${isViral ? "mt-3 text-2xl" : "text-lg"}`} style={{ color: `${normalizedProfile.themeColors.textColor}CC` }}>{normalizedProfile.professionalTitle}</p>
                  {normalizedProfile.location && <p className="mt-1 text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}B3` }}>{normalizedProfile.location}</p>}
                  <p className="mt-1 text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}B3` }}>{PROFILE_LANGUAGE_LABELS[normalizedProfile.language]}</p>
                  {isViral && (
                    <Link href={contactHref} target="_blank" className="mt-6 inline-flex">
                      <Button className="rounded-full px-6 text-white hover:opacity-90" style={{ backgroundColor: normalizedProfile.themeColors.accentColor }}>
                        Quero um vídeo nesse nível
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isViral && normalizedProfile.videoUrls.some(Boolean) && (
            <div className="border-b p-6 lg:p-10" style={{ borderColor: `${normalizedProfile.themeColors.accentColor}30` }}>
              <div className="grid gap-4 md:grid-cols-3">
                {normalizedProfile.videoUrls.filter(Boolean).slice(0, 3).map((videoUrl, index) => {
                  const embedUrl = getEmbedUrl(videoUrl)
                  return (
                    <div key={`${videoUrl}-hero-${index}`} className="aspect-video overflow-hidden rounded-3xl border" style={{ borderColor: `${normalizedProfile.themeColors.accentColor}30` }}>
                      {embedUrl ? (
                        <iframe src={embedUrl} title={`Destaque ${index + 1}`} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                      ) : (
                        <Link href={videoUrl} target="_blank" className="flex h-full items-center justify-center text-sm" style={{ color: normalizedProfile.themeColors.accentColor }}>
                          Abrir vídeo {index + 1}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className={`grid gap-6 p-6 lg:p-10 ${isMinimal ? "lg:grid-cols-1" : "lg:grid-cols-[1.2fr,0.8fr]"}`}>
            <div className="space-y-6">
              <Card className="border" style={cardStyle}>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold" style={{ color: normalizedProfile.themeColors.textColor }}>Sobre</h2>
                  <p className="text-sm leading-6" style={{ color: `${normalizedProfile.themeColors.textColor}CC` }}>
                    {normalizedProfile.bio || "Este editor ainda não adicionou uma bio profissional."}
                  </p>
                </CardContent>
              </Card>

              <Card className="border" style={cardStyle}>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5" style={{ color: normalizedProfile.themeColors.accentColor }} />
                    <h2 className="text-lg font-semibold" style={{ color: normalizedProfile.themeColors.textColor }}>Vídeos em destaque</h2>
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
                            style={{ color: normalizedProfile.themeColors.accentColor }}
                          >
                            Abrir vídeo {index + 1}
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}B3` }}>
                      Nenhum vídeo adicionado ainda.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border" style={cardStyle}>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold" style={{ color: normalizedProfile.themeColors.textColor }}>Ferramentas de edição</h2>
                  {normalizedProfile.editTools.length > 0 && (
                    <p className="text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}CC` }}>
                      Trabalha com {normalizedProfile.editTools.map((tool) => EDIT_TOOL_LABELS[tool as keyof typeof EDIT_TOOL_LABELS]).join(", ")}.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {normalizedProfile.editTools.length > 0 ? (
                      normalizedProfile.editTools.map((tool) => (
                        <Badge key={tool} variant="secondary" style={{ backgroundColor: `${normalizedProfile.themeColors.accentColor}22`, color: normalizedProfile.themeColors.accentColor }}>
                          {EDIT_TOOL_LABELS[tool as keyof typeof EDIT_TOOL_LABELS]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}B3` }}>Nenhuma ferramenta listada ainda.</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border" style={cardStyle}>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold" style={{ color: normalizedProfile.themeColors.textColor }}>Estilo de edição</h2>
                  <div className="flex flex-wrap gap-2">
                    {normalizedProfile.videoStyles.length > 0 ? (
                      normalizedProfile.videoStyles.map((style) => (
                        <Badge key={style} variant="secondary" style={{ backgroundColor: `${normalizedProfile.themeColors.accentColor}22`, color: normalizedProfile.themeColors.accentColor }}>
                          {VIDEO_STYLE_LABELS[style as keyof typeof VIDEO_STYLE_LABELS]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}B3` }}>Nenhum estilo listado ainda.</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border" style={cardStyle}>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold" style={{ color: normalizedProfile.themeColors.textColor }}>Contato principal</h2>
                  <p className="text-sm" style={{ color: `${normalizedProfile.themeColors.textColor}CC` }}>
                    {CONTACT_METHOD_LABELS[normalizedProfile.contactMethod]}: {normalizedProfile.contactValue || "Não informado"}
                  </p>
                  <Link href={contactHref} target="_blank">
                    <Button className="w-full text-white hover:opacity-90" style={{ backgroundColor: normalizedProfile.themeColors.accentColor }}>
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
