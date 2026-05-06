import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export type BroadcastNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  createdBy: string
}

export type UserSystemNotification = {
  id: string
  userId: string
  title: string
  message: string
  kind: "approval-expired" | "drive" | "system"
  createdAt: string
  read: boolean
}

export type EditUpState = {
  freeTrialClaimedEmails: string[]
  broadcasts: BroadcastNotification[]
  userNotifications: UserSystemNotification[]
}

const defaultState = (): EditUpState => ({
  freeTrialClaimedEmails: [],
  broadcasts: [],
  userNotifications: [],
})

const stateDir = path.join(process.cwd(), "data")
const stateFile = path.join(stateDir, "editup-state.json")

export const readEditUpState = async () => {
  try {
    const raw = await readFile(stateFile, "utf8")
    const parsed = JSON.parse(raw) as Partial<EditUpState>
    return {
      freeTrialClaimedEmails: Array.isArray(parsed.freeTrialClaimedEmails)
        ? parsed.freeTrialClaimedEmails.filter((email): email is string => typeof email === "string")
        : [],
      broadcasts: Array.isArray(parsed.broadcasts)
        ? parsed.broadcasts.filter(
            (item): item is BroadcastNotification =>
              !!item &&
              typeof item === "object" &&
              typeof item.id === "string" &&
              typeof item.title === "string" &&
              typeof item.message === "string" &&
              typeof item.createdAt === "string" &&
              typeof item.createdBy === "string"
          )
        : [],
      userNotifications: Array.isArray(parsed.userNotifications)
        ? parsed.userNotifications.filter(
            (item): item is UserSystemNotification =>
              !!item &&
              typeof item === "object" &&
              typeof item.id === "string" &&
              typeof item.userId === "string" &&
              typeof item.title === "string" &&
              typeof item.message === "string" &&
              (item.kind === "approval-expired" || item.kind === "drive" || item.kind === "system") &&
              typeof item.createdAt === "string" &&
              typeof item.read === "boolean"
          )
        : [],
    }
  } catch {
    return defaultState()
  }
}

export const writeEditUpState = async (state: EditUpState) => {
  await mkdir(stateDir, { recursive: true })
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8")
}

export const getFreeTrialStatus = (claimedEmailsCount: number) => {
  const capacity = 25
  const startingUsed = 7
  const cycleSpan = capacity - startingUsed + 1
  const cyclePosition = claimedEmailsCount % cycleSpan
  const used = startingUsed + cyclePosition

  return {
    used,
    capacity,
    remaining: Math.max(0, capacity - used),
  }
}

export const pushUserNotification = async (notification: UserSystemNotification) => {
  const state = await readEditUpState()
  state.userNotifications.unshift(notification)
  state.userNotifications = state.userNotifications.slice(0, 200)
  await writeEditUpState(state)
}
