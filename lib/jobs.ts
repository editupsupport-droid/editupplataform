const REFERENCE_PREFIX = "[[reference_link]]"

export const encodeJobDescription = (description: string, referenceLink?: string) => {
  const cleanDescription = description.trim()
  const cleanReferenceLink = referenceLink?.trim() ?? ""

  if (!cleanReferenceLink) return cleanDescription

  return `${REFERENCE_PREFIX}${cleanReferenceLink}\n${cleanDescription}`
}

export const decodeJobDescription = (rawDescription: string) => {
  if (!rawDescription.startsWith(REFERENCE_PREFIX)) {
    return {
      description: rawDescription,
      referenceLink: "",
    }
  }

  const withoutPrefix = rawDescription.slice(REFERENCE_PREFIX.length)
  const [referenceLine, ...rest] = withoutPrefix.split("\n")

  return {
    referenceLink: referenceLine.trim(),
    description: rest.join("\n").trim(),
  }
}

export const parseSalaryValue = (salary: string) => {
  const normalized = salary.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".")
  const numeric = Number.parseFloat(normalized)
  return Number.isFinite(numeric) ? numeric : null
}
