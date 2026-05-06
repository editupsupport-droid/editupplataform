export type AppearanceTheme = {
  id: string
  name: string
  background: string
  sidebar: string
  surface: string
  text: string
  accent: string
}

export const APPEARANCE_STORAGE_KEY = "editup-appearance-theme"
export const APPEARANCE_SAVED_STORAGE_KEY = "editup-saved-appearance-themes"

export const builtInAppearanceThemes: AppearanceTheme[] = [
  {
    id: "notion-workspace",
    name: "Notion Workspace",
    background: "#F7F6F3",
    sidebar: "#FBFBFA",
    surface: "#FFFFFF",
    text: "#2F3437",
    accent: "#37352F",
  },
  {
    id: "midnight-vanta",
    name: "Notion Dark",
    background: "#191919",
    sidebar: "#202020",
    surface: "#202020",
    text: "#EDEDEB",
    accent: "#EDEDEB",
  },
  {
    id: "light-neve",
    name: "Notion Light",
    background: "#FFFFFF",
    sidebar: "#FBFBFA",
    surface: "#FFFFFF",
    text: "#2F3437",
    accent: "#37352F",
  },
  {
    id: "discord-classic",
    name: "Graphite",
    background: "#F1F1EF",
    sidebar: "#EDECE9",
    surface: "#FFFFFF",
    text: "#37352F",
    accent: "#5F5E5A",
  },
  {
    id: "forest-sereno",
    name: "Sage",
    background: "#F4F6F1",
    sidebar: "#EEF2EA",
    surface: "#FFFFFF",
    text: "#2F3A31",
    accent: "#5F6F52",
  },
  {
    id: "cyberpunk-neon",
    name: "Warm Paper",
    background: "#F8F5F0",
    sidebar: "#F1EDE6",
    surface: "#FFFFFF",
    text: "#3B332B",
    accent: "#8A6F4D",
  },
]

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "").trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized

  const value = Number.parseInt(expanded, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b]
    .map((part) => clamp(part).toString(16).padStart(2, "0"))
    .join("")}`

const mixHex = (first: string, second: string, weight: number) => {
  const from = hexToRgb(first)
  const to = hexToRgb(second)

  return rgbToHex({
    r: from.r + (to.r - from.r) * weight,
    g: from.g + (to.g - from.g) * weight,
    b: from.b + (to.b - from.b) * weight,
  })
}

const getContrastText = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.56 ? "#111111" : "#ffffff"
}

const getRelativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const transform = (value: number) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
}

const getContrastRatio = (first: string, second: string) => {
  const firstLuminance = getRelativeLuminance(first)
  const secondLuminance = getRelativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

const ensureReadableText = (background: string, preferredText: string) =>
  getContrastRatio(background, preferredText) >= 4.5 ? preferredText : getContrastText(background)

const isLegacyVantaTheme = (theme: AppearanceTheme) =>
  theme.id?.trim() === "midnight-vanta" &&
  (
    theme.name?.toLocaleLowerCase("pt-BR").includes("vanta") ||
    theme.background?.trim().toLowerCase() === "#000000" ||
    theme.sidebar?.trim().toLowerCase() === "#050505" ||
    theme.surface?.trim().toLowerCase() === "#0a0a0a" ||
    theme.accent?.trim().toLowerCase() === "#0022fe"
  )

export const normalizeAppearanceTheme = (theme: AppearanceTheme): AppearanceTheme => {
  if (isLegacyVantaTheme(theme)) {
    return builtInAppearanceThemes[0]
  }

  const id = theme.id?.trim() || "custom"
  const builtIn = builtInAppearanceThemes.find((item) => item.id === id)

  if (builtIn) return builtIn

  return {
    id,
    name: theme.name?.trim() || "Custom theme",
    background: theme.background?.trim() || "#F7F6F3",
    sidebar: theme.sidebar?.trim() || "#FBFBFA",
    surface: theme.surface?.trim() || "#FFFFFF",
    text: theme.text?.trim() || "#2F3437",
    accent: theme.accent?.trim() || "#37352F",
  }
}

export const applyAppearanceTheme = (theme: AppearanceTheme) => {
  if (typeof document === "undefined") return

  const normalized = normalizeAppearanceTheme(theme)
  const root = document.documentElement
  root.classList.remove("dark")
  root.dataset.appearanceTheme = normalized.id
  const backgroundText = ensureReadableText(normalized.background, normalized.text)
  const surfaceText = ensureReadableText(normalized.surface, normalized.text)
  const sidebarText = ensureReadableText(normalized.sidebar, normalized.text)
  const border = mixHex(normalized.surface, normalized.text, 0.12)
  const muted = mixHex(normalized.background, normalized.surface, 0.78)
  const mutedForeground = ensureReadableText(normalized.background, mixHex(backgroundText, normalized.background, 0.45))
  const secondary = mixHex(normalized.surface, normalized.background, 0.22)
  const sidebarAccent = mixHex(normalized.sidebar, normalized.surface, 0.34)
  const primaryForeground = getContrastText(normalized.accent)

  const entries: Array<[string, string]> = [
    ["--background", normalized.background],
    ["--foreground", backgroundText],
    ["--card", normalized.surface],
    ["--card-foreground", surfaceText],
    ["--popover", normalized.surface],
    ["--popover-foreground", surfaceText],
    ["--primary", normalized.accent],
    ["--primary-foreground", primaryForeground],
    ["--secondary", secondary],
    ["--secondary-foreground", ensureReadableText(secondary, backgroundText)],
    ["--muted", muted],
    ["--muted-foreground", mutedForeground],
    ["--accent", secondary],
    ["--accent-foreground", ensureReadableText(secondary, backgroundText)],
    ["--border", border],
    ["--input", mixHex(normalized.background, normalized.surface, 0.6)],
    ["--ring", normalized.accent],
    ["--chart-1", normalized.accent],
    ["--chart-2", mixHex(normalized.accent, normalized.text, 0.18)],
    ["--chart-3", mixHex(normalized.accent, normalized.text, 0.36)],
    ["--chart-4", mixHex(normalized.accent, normalized.text, 0.54)],
    ["--chart-5", mixHex(normalized.accent, normalized.text, 0.72)],
    ["--sidebar", normalized.sidebar],
    ["--sidebar-foreground", sidebarText],
    ["--sidebar-primary", normalized.accent],
    ["--sidebar-primary-foreground", primaryForeground],
    ["--sidebar-accent", sidebarAccent],
    ["--sidebar-accent-foreground", ensureReadableText(sidebarAccent, sidebarText)],
    ["--sidebar-border", mixHex(normalized.sidebar, normalized.text, 0.12)],
    ["--sidebar-ring", normalized.accent],
  ]

  for (const [token, value] of entries) {
    root.style.setProperty(token, value)
  }
}
