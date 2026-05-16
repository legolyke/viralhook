export type PlanName = 'free' | 'creator' | 'pro' | 'agency'

export interface Subscription {
  id: string
  user_id: string
  plan: PlanName
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  exports_used: number
  voiceover_used: number
  period_start: string
  created_at: string
  updated_at: string
}

export const PLAN_LIMITS: Record<PlanName, number> = {
  free: 3,
  creator: 40,
  pro: 150,
  agency: 2000,
}

export const VOICEOVER_LIMITS: Record<PlanName, number> = {
  free: 0,
  creator: 0,
  pro: 50,
  agency: 300,
}

export const PLAN_LABELS: Record<PlanName, string> = {
  free: 'FREE',
  creator: 'CREATOR',
  pro: 'PRO',
  agency: 'AGENCY',
}

export const PLAN_PRICES: Record<string, string> = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  agency: process.env.STRIPE_PRICE_AGENCY ?? '',
}

export const PLAN_PRICES_EUR: Record<PlanName, number> = {
  free: 0,
  creator: 19,
  pro: 49,
  agency: 149,
}

export function getPlanLimit(plan: PlanName): number {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function getVoiceoverLimit(plan: PlanName): number {
  return VOICEOVER_LIMITS[plan] ?? 0
}

export function isAtLimit(plan: PlanName, exportsUsed: number): boolean {
  return exportsUsed >= getPlanLimit(plan)
}

export function isAtVoiceoverLimit(plan: PlanName, voiceoverUsed: number): boolean {
  return voiceoverUsed >= getVoiceoverLimit(plan)
}

export function canUseAITools(plan: PlanName): boolean {
  return plan === 'creator' || plan === 'pro' || plan === 'agency'
}

export function canUseVoiceover(plan: PlanName): boolean {
  return plan === 'pro' || plan === 'agency'
}
