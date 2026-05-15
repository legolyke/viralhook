export type PlanName = 'free' | 'creator' | 'pro' | 'agency'

export interface Subscription {
  id: string
  user_id: string
  plan: PlanName
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  exports_used: number
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

export function getPlanLimit(plan: PlanName): number {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function isAtLimit(plan: PlanName, exportsUsed: number): boolean {
  return exportsUsed >= getPlanLimit(plan)
}
